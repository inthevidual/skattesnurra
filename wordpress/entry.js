/**
 * Skattesnurra — WordPress-embeddable widget.
 *
 * Usage:
 *   <link rel="stylesheet" href="skattesnurra.css">
 *   <div id="skattesnurra"></div>
 *   <script src="skattesnurra.js"></script>
 */

import { beräknaSkatteuppdelning } from '../js/tax-engine.js';
import {
  fyllKommunväljare,
  fyllFörsamlingsväljare,
  fyllÅrsväljare,
  läsFormulärVärden,
  visaResultat,
  visaFelmeddelande,
  visaNollläge,
} from '../js/ui.js';
import { beräknaHistoriskSkatt } from '../js/history-engine.js';
import { visaHistorisktResultat, visaDecenniumKommentar } from '../js/history-ui.js';
import { initieraUtveckling } from '../js/utveckling-ui.js';

/* ── HTML template ─────────────────────────────────────────────────── */

const TEMPLATE = `
<div class="py-4">

  <section class="mb-8">
    <h2 class="text-2xl sm:text-3xl font-bold mb-4">Räkna ut din inkomstskatt</h2>
    <p class="mb-2">Sverige har idag bland världens högsta skatter på arbete. Men bara <strong>1/10</strong> svenskar vet hur mycket de betalar. Det vill vi råda bot på.</p>
    <p>Här kan du ange inkomst och hemkommun, och se din verkliga skatt.</p>
  </section>

  <nav class="skatt-tab-bar mb-0" role="tablist" aria-label="Välj vy">
    <button id="tab-nutid" role="tab" aria-selected="true" aria-controls="panel-nutid">Nutid</button>
    <button id="tab-historik" role="tab" aria-selected="false" aria-controls="panel-historik">Historik</button>
    <button id="tab-utveckling" role="tab" aria-selected="false" aria-controls="panel-utveckling">Över tid</button>
  </nav>

  <div id="panel-nutid" role="tabpanel" aria-labelledby="tab-nutid">
  <section class="bg-gray-100 rounded-lg rounded-tl-none p-4 sm:p-6 mb-8">
    <form id="myForm">
      <div class="flex items-center gap-2 mb-4">
        <label for="inkomstar" class="text-base font-medium">Inkomstår:</label>
        <select id="inkomstar"
                class="rounded border border-gray-300 px-3 py-2 text-base bg-white"></select>
      </div>

      <div class="flex flex-col sm:flex-row gap-4 items-end">
      <fieldset class="flex-1 w-full">
        <label for="komm-search" class="block text-base font-medium mb-1">Kommun:</label>
        <div class="relative" id="komm-wrapper">
          <input type="text" id="komm-search" autocomplete="off" placeholder="Sök kommun..."
                 class="w-full rounded border border-gray-300 px-3 py-2 text-base">
          <ul id="komm-list" class="hidden absolute z-10 w-full bg-white border border-gray-300 rounded mt-1 max-h-60 overflow-y-auto shadow-lg"></ul>
          <select id="komm" name="kommun" class="hidden"></select>
        </div>
      </fieldset>

      <fieldset class="flex-1 w-full">
        <label class="block text-base font-medium mb-1">Månadslön:</label>
        <div class="flex items-baseline gap-1 mb-2">
          <input type="text" id="lon-edit" inputmode="numeric"
                 class="w-32 text-2xl font-bold bg-transparent border-b-2 border-dashed border-gray-400 focus:border-blue-600 outline-none cursor-text transition-colors text-right"
                 style="color:#0072CE">
          <span class="text-lg font-medium text-gray-500">kr</span>
        </div>
        <input type="range" id="lon" name="lon" min="0" max="100000" step="1000" value="25000"
               class="skatt-slider w-full">
        <p class="text-xs text-gray-400 mt-1">Dra för jämna tusental, klicka och fyll i för exakt lön</p>
      </fieldset>
      </div>
    </form>

    <div class="mt-4 flex flex-col sm:flex-row gap-4 items-start">
      <label class="flex items-center gap-2 cursor-pointer select-none">
        <input type="checkbox" id="kyrkomedlem" class="w-4 h-4" style="accent-color:#7B5EA7">
        <span class="text-base font-medium">Medlem i Svenska kyrkan?</span>
      </label>

      <fieldset id="forsamling-fieldset" class="flex-1 w-full hidden">
        <label for="forsamling-search" class="block text-base font-medium mb-1">Församling:</label>
        <div class="relative" id="forsamling-wrapper">
          <input type="text" id="forsamling-search" autocomplete="off" placeholder="Sök församling..."
                 class="w-full rounded border border-gray-300 px-3 py-2 text-base">
          <ul id="forsamling-list" class="hidden absolute z-10 w-full bg-white border border-gray-300 rounded mt-1 max-h-60 overflow-y-auto shadow-lg"></ul>
          <select id="forsamling" class="hidden"></select>
        </div>
      </fieldset>
    </div>
  </section>

  <section id="resultat" aria-live="polite" class="bg-gray-100 rounded-lg p-4 sm:p-6 mb-8">
  </section>

  <section class="mb-8">
    <h3 class="text-lg font-semibold mb-2">Om räknesnurran</h3>
    <p class="text-sm text-gray-700 leading-relaxed">
      Uträkningen är förenklad och tar inte hänsyn till bland annat reseavdrag och ränteavdrag.
      Den gäller bara arbetsinkomst och bara för personer som är yngre än 66 år. Marginaleffekter av bidrag och socialförsäkringsförmåner beaktas inte.
      Moms och punktskatter (bensin-, el-, alkohol- och tobaksskatter) räknas som procent av nettoinkomsten enligt snittet i befolkningen (18,4 procent).
      Räknesnurran gäller endast för den med normal arbetsgivaravgift på 31,42 procent och tar inte hänsyn till nedsatt arbetsgivaravgift för de som uppnått pensionsålder.
      Egenföretagare (enskild firma och handelsbolag) betalar egenavgift på 28,97 procent.
    </p>
  </section>
  </div>

  <div id="panel-historik" role="tabpanel" aria-labelledby="tab-historik" hidden>
  <section class="bg-gray-100 rounded-lg rounded-tl-none p-4 sm:p-6 mb-8">
    <div class="mb-4">
      <label class="block text-base font-medium mb-1">År: <span id="historik-year-display" class="text-xl font-bold" style="color:#0072CE">2025</span></label>
      <input type="range" id="historik-year" min="1971" max="2025" step="1" value="2025"
             class="skatt-slider w-full">
      <div class="flex justify-between text-xs text-gray-400 mt-1">
        <span>1971</span>
        <span>2025</span>
      </div>
    </div>

    <fieldset>
      <label class="block text-base font-medium mb-1">Månadslön (i dagens penningvärde):</label>
      <div class="flex items-baseline gap-1 mb-2">
        <input type="text" id="historik-lon-edit" inputmode="numeric"
               class="w-32 text-2xl font-bold bg-transparent border-b-2 border-dashed border-gray-400 focus:border-blue-600 outline-none cursor-text transition-colors text-right"
               style="color:#0072CE">
        <span class="text-lg font-medium text-gray-500">kr</span>
      </div>
      <input type="range" id="historik-lon" min="0" max="100000" step="1000" value="25000"
             class="skatt-slider w-full">
      <p class="text-xs text-gray-400 mt-1">Dra för jämna tusental, klicka och fyll i för exakt lön</p>
    </fieldset>

    <p class="text-sm text-gray-500 mt-3">Kommun: Riksgenomsnitt (historiska data använder nationella genomsnitt)</p>
  </section>

  <section id="historik-resultat" aria-live="polite" class="bg-gray-100 rounded-lg p-4 sm:p-6 mb-8">
  </section>

  <div id="historik-commentary" class="mb-8">
  </div>

  <section class="mb-8">
    <h3 class="text-lg font-semibold mb-2">Om historiken</h3>
    <p class="text-sm text-gray-700 leading-relaxed">
      Den historiska skatteberäkningen använder riksgenomsnittlig kommunalskattesats och uppskattar moms efter genomsnittlig konsumtion. Alla belopp visas i dagens penningvärde och i det aktuella årets penningvärde (KPI-justerat). Beräkningen är baserad på data från SCB och Skatteverket.
    </p>
  </section>
  </div>

  <div id="panel-utveckling" role="tabpanel" aria-labelledby="tab-utveckling" hidden>
  <section class="bg-gray-100 rounded-lg rounded-tl-none p-4 sm:p-6 mb-8">
    <fieldset>
      <label class="block text-base font-medium mb-1">Månadslön (i dagens penningvärde):</label>
      <div class="flex items-baseline gap-1 mb-2">
        <input type="text" id="utveckling-lon-edit" inputmode="numeric"
               class="w-32 text-2xl font-bold bg-transparent border-b-2 border-dashed border-gray-400 focus:border-blue-600 outline-none cursor-text transition-colors text-right"
               style="color:#0072CE">
        <span class="text-lg font-medium text-gray-500">kr</span>
      </div>
      <input type="range" id="utveckling-lon" min="0" max="100000" step="1000" value="25000"
             class="skatt-slider w-full">
      <p class="text-xs text-gray-400 mt-1">Dra för jämna tusental, klicka och fyll i för exakt lön</p>
    </fieldset>
    <p class="text-sm text-gray-500 mt-3">Kommun: Riksgenomsnitt (historiska data använder nationella genomsnitt)</p>
  </section>

  <section id="utveckling-chart" class="mb-4">
  </section>

  <div id="utveckling-annotations" class="mb-8">
  </div>

  <section class="mb-8">
    <h3 class="text-lg font-semibold mb-2">Om utvecklingen</h3>
    <p class="text-sm text-gray-700 leading-relaxed">
      Diagrammet visar hur skattetrycket på arbete har förändrats i Sverige mellan 1971 och 2025. Alla belopp baseras på en fast reallön i dagens penningvärde, så att enbart förändringar i skatteregler syns. Den streckade linjen visar den totala effektiva skattesatsen (alla skatter som andel av arbetsgivarens kostnad). Beräkningen använder riksgenomsnittlig kommunalskattesats.
    </p>
  </section>
  </div>

</div>
`;

/* ── Helpers ────────────────────────────────────────────────────────── */

function formateraInmatning(n) {
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '\u2009');
}

function tolkLön(sträng) {
  return Number(sträng.replace(/\s/g, ''));
}

/* ── Initialization ────────────────────────────────────────────────── */

function initieraTabs() {
  const tabs = ['nutid', 'historik', 'utveckling'].map(id => ({
    tab: document.querySelector(`#tab-${id}`),
    panel: document.querySelector(`#panel-${id}`),
  }));

  function aktivera(aktiv) {
    for (const { tab, panel } of tabs) {
      const selected = tab === aktiv.tab;
      tab.setAttribute('aria-selected', String(selected));
      if (selected) panel.removeAttribute('hidden');
      else panel.setAttribute('hidden', '');
    }
  }

  for (const entry of tabs) {
    entry.tab.addEventListener('click', () => aktivera(entry));
  }
}

function initieraHistorik() {
  const yearSlider = document.querySelector('#historik-year');
  const yearDisplay = document.querySelector('#historik-year-display');
  const incomeSlider = document.querySelector('#historik-lon');
  const incomeEdit = document.querySelector('#historik-lon-edit');
  const resultatContainer = document.querySelector('#historik-resultat');
  const commentaryContainer = document.querySelector('#historik-commentary');

  let exaktHistorikLön = null;

  function beräknaHistorik() {
    const year = Number(yearSlider.value);
    const månadslön = exaktHistorikLön !== null ? exaktHistorikLön : Number(incomeSlider.value);
    const årsinkomst = månadslön * 12;
    yearDisplay.textContent = year;

    if (månadslön <= 0) {
      visaNollläge(resultatContainer);
      visaDecenniumKommentar(commentaryContainer, year);
      return;
    }

    const resultat = beräknaHistoriskSkatt(årsinkomst, year);
    visaHistorisktResultat(resultatContainer, resultat);
    visaDecenniumKommentar(commentaryContainer, year);
  }

  function synkaFrånReglage() {
    exaktHistorikLön = null;
    incomeEdit.value = formateraInmatning(Number(incomeSlider.value));
    beräknaHistorik();
  }

  function synkaFrånInmatning() {
    let val = tolkLön(incomeEdit.value);
    if (isNaN(val) || val < 0) val = 0;
    if (val > 100000) val = 100000;
    exaktHistorikLön = val;
    incomeSlider.value = Math.round(val / 1000) * 1000;
    incomeEdit.value = formateraInmatning(val);
    beräknaHistorik();
  }

  yearSlider.addEventListener('input', () => {
    yearDisplay.textContent = yearSlider.value;
    beräknaHistorik();
  });
  incomeSlider.addEventListener('input', synkaFrånReglage);
  incomeEdit.addEventListener('change', synkaFrånInmatning);
  incomeEdit.addEventListener('blur', synkaFrånInmatning);

  let timer = null;
  incomeEdit.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      let val = tolkLön(incomeEdit.value);
      if (!isNaN(val) && val >= 0) {
        if (val > 100000) val = 100000;
        exaktHistorikLön = val;
        incomeSlider.value = Math.round(val / 1000) * 1000;
        beräknaHistorik();
      }
    }, 400);
  });

  incomeEdit.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      clearTimeout(timer);
      synkaFrånInmatning();
      incomeEdit.blur();
    }
  });

  incomeEdit.value = formateraInmatning(Number(incomeSlider.value));
  beräknaHistorik();
}

function init() {
  const container = document.getElementById('skattesnurra');
  if (!container) {
    console.warn('Skattesnurra: inget element med id="skattesnurra" hittades.');
    return;
  }

  // Load Google Fonts if not already present
  if (!document.querySelector('link[href*="fonts.googleapis.com"][href*="Inter"]')) {
    const preconnect1 = document.createElement('link');
    preconnect1.rel = 'preconnect';
    preconnect1.href = 'https://fonts.googleapis.com';
    document.head.appendChild(preconnect1);

    const preconnect2 = document.createElement('link');
    preconnect2.rel = 'preconnect';
    preconnect2.href = 'https://fonts.gstatic.com';
    preconnect2.crossOrigin = '';
    document.head.appendChild(preconnect2);

    const fonts = document.createElement('link');
    fonts.rel = 'stylesheet';
    fonts.href = 'https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400&family=Inter:wght@300;400;600;700&display=swap';
    document.head.appendChild(fonts);
  }

  // Inject template
  container.innerHTML = TEMPLATE;

  // ── Wire up "Nutid" tab ──────────────────────────────────────────

  let exaktLön = null;
  const form = document.querySelector('#myForm');
  const selectElement = form.querySelector('#komm');
  const slider = form.querySelector('#lon');
  const edit = document.querySelector('#lon-edit');
  const resultatBehållare = document.querySelector('#resultat');
  const inkomstårSelect = document.querySelector('#inkomstar');

  function beräkna() {
    const värden = läsFormulärVärden(form);
    if (exaktLön !== null) värden.månadslön = exaktLön;

    if (värden.månadslön == null || isNaN(värden.månadslön) || värden.månadslön < 0) {
      resultatBehållare.innerHTML = '';
      return;
    }
    if (värden.månadslön === 0) {
      visaNollläge(resultatBehållare);
      return;
    }

    const uppdelning = beräknaSkatteuppdelning(värden, värden.inkomstår);
    if (!uppdelning) {
      visaFelmeddelande(resultatBehållare, 'Skriv bara siffror utan mellanslag eller kommatecken.');
      return;
    }
    visaResultat(resultatBehållare, uppdelning);
  }

  fyllÅrsväljare(inkomstårSelect);
  fyllKommunväljare(selectElement, Number(inkomstårSelect.value));

  function synkaFrånReglage() {
    exaktLön = null;
    edit.value = formateraInmatning(Number(slider.value));
    beräkna();
  }

  function synkaFrånInmatning() {
    let val = tolkLön(edit.value);
    if (isNaN(val) || val < 0) val = 0;
    if (val > 100000) val = 100000;
    exaktLön = val;
    slider.value = Math.round(val / 1000) * 1000;
    edit.value = formateraInmatning(val);
    beräkna();
  }

  slider.addEventListener('input', synkaFrånReglage);
  edit.addEventListener('change', synkaFrånInmatning);
  edit.addEventListener('blur', synkaFrånInmatning);

  let inmatningsTimer = null;
  edit.addEventListener('input', () => {
    clearTimeout(inmatningsTimer);
    inmatningsTimer = setTimeout(() => {
      let val = tolkLön(edit.value);
      if (!isNaN(val) && val >= 0) {
        if (val > 100000) val = 100000;
        exaktLön = val;
        slider.value = Math.round(val / 1000) * 1000;
        beräkna();
      }
    }, 400);
  });

  edit.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      clearTimeout(inmatningsTimer);
      synkaFrånInmatning();
      edit.blur();
    }
  });

  form.addEventListener('submit', (event) => event.preventDefault());

  // Kyrkoavgift
  const kyrkomedlem = document.querySelector('#kyrkomedlem');
  const församlingFieldset = document.querySelector('#forsamling-fieldset');
  const församlingSelect = document.querySelector('#forsamling');

  function hämtaKommunNamn() {
    return selectElement.options[selectElement.selectedIndex].text;
  }

  function uppdateraFörsamlingsväljare() {
    if (hämtaKommunNamn() !== 'Riksgenomsnitt') {
      fyllFörsamlingsväljare(församlingSelect, hämtaKommunNamn(), Number(inkomstårSelect.value));
      församlingFieldset.classList.remove('hidden');
    } else {
      församlingFieldset.classList.add('hidden');
    }
  }

  kyrkomedlem.addEventListener('change', () => {
    if (kyrkomedlem.checked) uppdateraFörsamlingsväljare();
    else församlingFieldset.classList.add('hidden');
    beräkna();
  });

  församlingSelect.addEventListener('change', () => beräkna());

  selectElement.addEventListener('change', () => {
    if (kyrkomedlem.checked) uppdateraFörsamlingsväljare();
    synkaFrånReglage();
  });

  inkomstårSelect.addEventListener('change', () => {
    const år = Number(inkomstårSelect.value);
    fyllKommunväljare(selectElement, år);
    if (kyrkomedlem.checked) uppdateraFörsamlingsväljare();
    synkaFrånReglage();
  });

  // Initial render
  edit.value = formateraInmatning(Number(slider.value));
  beräkna();

  // ── Other tabs ───────────────────────────────────────────────────

  initieraTabs();
  initieraHistorik();
  initieraUtveckling();
}

/* ── Boot ───────────────────────────────────────────────────────────── */

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
