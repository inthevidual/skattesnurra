/**
 * Skattebetalardagen — WordPress plugin.
 * Shortcode: [skattebetalardagen]
 *
 * Shows the date when your earnings start going entirely to taxes,
 * based on municipality and monthly salary. Uses the shared skattesnurra
 * tax engine for accurate calculations.
 */

import { beräknaSkatteuppdelning } from '../js/tax-engine.js';
import inkomstår2018 from '../data/2018.js';
import inkomstår2019 from '../data/2019.js';
import inkomstår2020 from '../data/2020.js';
import inkomstår2021 from '../data/2021.js';
import inkomstår2022 from '../data/2022.js';
import inkomstår2023 from '../data/2023.js';
import inkomstår2024 from '../data/2024.js';
import inkomstår2025 from '../data/2025.js';
import inkomstår2026 from '../data/2026.js';

/* ── Constants ─────────────────────────────────────────────────────── */

const INKOMSTÅR_DATA = {
  2018: inkomstår2018, 2019: inkomstår2019, 2020: inkomstår2020,
  2021: inkomstår2021, 2022: inkomstår2022, 2023: inkomstår2023,
  2024: inkomstår2024, 2025: inkomstår2025, 2026: inkomstår2026,
};
const STANDARD_ÅR = 2026;
const DEFAULT_LÖN = 41700;
const GENOMSNITTSLÖN = {
  2018: 31250, 2019: 32200, 2020: 33400,
  2021: 34100, 2022: 35500, 2023: 37150,
  2024: 38100, 2025: 40300, 2026: 41700,
};

/* ── Helpers ───────────────────────────────────────────────────────── */

function formatera(n) {
  return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '\u2009');
}

function tolka(s) {
  return Number(s.replace(/\s/g, ''));
}

function dagarPåÅret(år) {
  return (år % 4 === 0 && (år % 100 !== 0 || år % 400 === 0)) ? 366 : 365;
}

function beräknaDag(genomsnittligSkattesats, år) {
  const dagar = dagarPåÅret(år);
  const dagarFörStaten = Math.round(dagar * genomsnittligSkattesats);
  const friaDagar = dagar - dagarFörStaten;
  const datum = new Date(år, 0, 1);
  datum.setDate(datum.getDate() + friaDagar);
  return datum;
}

/**
 * Skatteandel som speglar Skattebetalarnas Skattebetalardagen-rapport.
 *
 * Rapporten räknar i hela hundratal kronor ("Beräkningarna utgår från exakta
 * tal men siffrorna har avrundats till närmsta hundratal"). Skattemotorn räknar
 * exakt, vilket gör att kommuner som ligger nära en dygnsgräns kan hamna en dag
 * fel mot rapporten. Genom att avrunda nettoinkomsten till närmaste 100 kr innan
 * skatteandelen härleds återger vi rapportens dagar (riksgenomsnittet ger 27 juni
 * och 113→117 av kontrollerade kommuner stämmer på dagen).
 */
function rapportskattesats(uppdelning) {
  const { nettoÅrsinkomst, moms, totalArbetsgivarkostnad } = uppdelning;
  if (!nettoÅrsinkomst || !totalArbetsgivarkostnad) return uppdelning.genomsnittligSkattesats;
  const viktadMoms = moms / nettoÅrsinkomst; // VIKTAD_MOMS
  const nettoAvrundat = Math.round(nettoÅrsinkomst / 100) * 100;
  const behållet = nettoAvrundat - viktadMoms * nettoAvrundat; // kvar efter moms
  const totalSkatt = totalArbetsgivarkostnad - behållet;
  return totalSkatt / totalArbetsgivarkostnad;
}

function formateraDatum(datum) {
  return new Intl.DateTimeFormat('sv-SE', { day: 'numeric', month: 'long' }).format(datum);
}

function dagNummer(datum) {
  const start = new Date(datum.getFullYear(), 0, 1);
  return Math.floor((datum - start) / 86400000) + 1;
}

/* ── Slider CSS ───────────────────────────────────────────────────── */

const SLIDER_CSS = `
input[type="range"].skbdag-slider {
  -webkit-appearance: none;
  appearance: none;
  height: 10px;
  border-radius: 5px;
  background: #0072CE;
  outline: none;
  cursor: pointer;
}
input[type="range"].skbdag-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 22px; height: 28px;
  border-radius: 4px;
  background: #f5f5f5;
  border: 1px solid #ccc;
  box-shadow: 0 1px 3px rgba(0,0,0,.2);
  cursor: grab;
}
input[type="range"].skbdag-slider::-webkit-slider-thumb:active {
  cursor: grabbing; background: #e8e8e8;
}
input[type="range"].skbdag-slider::-moz-range-thumb {
  width: 22px; height: 28px;
  border-radius: 4px;
  background: #f5f5f5;
  border: 1px solid #ccc;
  box-shadow: 0 1px 3px rgba(0,0,0,.2);
  cursor: grab;
}
input[type="range"].skbdag-slider::-moz-range-thumb:active {
  cursor: grabbing; background: #e8e8e8;
}
input[type="range"].skbdag-slider::-moz-range-track {
  height: 10px; border-radius: 5px; background: #0072CE; border: none;
}
`;

/* ── Searchable dropdown factory ──────────────────────────────────── */

function skapaVäljare({ wrapper, input, list, select }) {
  let poster = [];
  let etikettFn = () => '';
  let värdeFn = () => '';

  function fyllSelect() {
    select.innerHTML = '';
    for (const p of poster) {
      const opt = document.createElement('option');
      opt.value = värdeFn(p);
      opt.textContent = etikettFn(p);
      select.appendChild(opt);
    }
    if (select.options.length) input.value = select.options[0].text;
  }

  function byggLista(filter) {
    list.innerHTML = '';
    const lower = filter.toLowerCase();
    for (const p of poster) {
      const namn = etikettFn(p);
      if (lower && !namn.toLowerCase().includes(lower)) continue;
      const li = document.createElement('li');
      li.textContent = namn;
      li.dataset.value = värdeFn(p);
      li.style.cssText = 'padding:6px 12px;cursor:pointer;list-style:none';
      li.addEventListener('mouseenter', () => { li.style.background = '#dbeafe'; });
      li.addEventListener('mouseleave', () => { li.style.background = ''; });
      list.appendChild(li);
    }
  }

  function öppna() {
    byggLista(input.value === select.options[select.selectedIndex]?.text ? '' : input.value);
    list.style.display = 'block';
  }

  function stäng() { list.style.display = 'none'; }

  function välj(namn, värde) {
    input.value = namn;
    for (let i = 0; i < select.options.length; i++) {
      if (select.options[i].value === String(värde) && select.options[i].text === namn) {
        select.selectedIndex = i;
        break;
      }
    }
    stäng();
    select.dispatchEvent(new Event('change'));
  }

  input.addEventListener('focus', () => { input.select(); öppna(); });
  input.addEventListener('input', () => { byggLista(input.value); list.style.display = 'block'; });

  list.addEventListener('mousedown', (e) => {
    const li = e.target.closest('li');
    if (li) välj(li.textContent, li.dataset.value);
  });

  document.addEventListener('mousedown', (e) => {
    if (!wrapper.contains(e.target)) {
      if (select.options.length) input.value = select.options[select.selectedIndex].text;
      stäng();
    }
  });

  input.addEventListener('keydown', (e) => {
    const items = list.querySelectorAll('li');
    const active = list.querySelector('[data-active]');
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!items.length) return;
      const next = active ? active.nextElementSibling || items[0] : items[0];
      if (active) { delete active.dataset.active; active.style.background = ''; }
      next.dataset.active = '';
      next.style.background = '#bfdbfe';
      next.scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!items.length) return;
      const prev = active ? active.previousElementSibling || items[items.length - 1] : items[items.length - 1];
      if (active) { delete active.dataset.active; active.style.background = ''; }
      prev.dataset.active = '';
      prev.style.background = '#bfdbfe';
      prev.scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (active) välj(active.textContent, active.dataset.value);
      else if (items.length === 1) välj(items[0].textContent, items[0].dataset.value);
    } else if (e.key === 'Escape') {
      if (select.options.length) input.value = select.options[select.selectedIndex].text;
      stäng();
      input.blur();
    }
  });

  return function uppdatera(nyaPoster, nyEtikettFn, nyVärdeFn) {
    poster = nyaPoster;
    etikettFn = nyEtikettFn;
    värdeFn = nyVärdeFn;
    fyllSelect();
    stäng();
  };
}

/* ── Month names for the year bar ─────────────────────────────────── */

const MÅNADER = ['Jan','Feb','Mar','Apr','Maj','Jun','Jul','Aug','Sep','Okt','Nov','Dec'];

/* ── HTML template ────────────────────────────────────────────────── */

const TEMPLATE = `
<style>${ SLIDER_CSS }</style>

<div class="mb-6">
  <h2 class="text-2xl sm:text-3xl font-bold mb-2" style="line-height:1.2">
    När infaller din Skattebetalardag?
  </h2>
  <p class="text-sm text-gray-600 mb-0">
    Skattebetalardagen markerar den dag på året då du slutar arbeta för dig själv
    – från och med denna dag går hela din lön till skatter och avgifter.
  </p>
</div>

<section class="bg-gray-100 rounded-lg p-4 sm:p-6 mb-6">
  <div style="display:flex;align-items:center;gap:8px;margin-bottom:16px">
    <label for="skbdag-ar" style="font-size:1rem;font-weight:500">Inkomstår:</label>
    <select id="skbdag-ar" style="border-radius:6px;border:1px solid #d1d5db;padding:6px 12px;font-size:1rem;font-family:inherit;background:#fff"></select>
  </div>

  <div class="flex flex-col sm:flex-row gap-4 items-end">
    <fieldset class="flex-1 w-full" style="border:none;margin:0;padding:0;min-inline-size:auto">
      <label for="skbdag-komm-search" class="block text-base font-medium mb-1">Kommun:</label>
      <div class="relative" id="skbdag-komm-wrapper" style="position:relative">
        <input type="text" id="skbdag-komm-search" autocomplete="off" placeholder="Sök kommun…"
               class="w-full rounded border border-gray-300 px-3 py-2 text-base" style="width:100%;border-radius:6px;border:1px solid #d1d5db;padding:6px 12px;font-size:1rem;font-family:inherit;box-sizing:border-box">
        <ul id="skbdag-komm-list" style="display:none;position:absolute;z-index:10;width:100%;background:#fff;border:1px solid #d1d5db;border-radius:6px;margin-top:4px;max-height:15rem;overflow-y:auto;box-shadow:0 4px 12px rgba(0,0,0,.12);list-style:none;padding:0"></ul>
        <select id="skbdag-komm" style="display:none"></select>
      </div>
    </fieldset>

    <fieldset class="flex-1 w-full" style="border:none;margin:0;padding:0;min-inline-size:auto">
      <label class="block text-base font-medium mb-1">Månadslön:</label>
      <div style="display:flex;align-items:baseline;gap:4px;margin-bottom:8px">
        <input type="text" id="skbdag-lon-edit" inputmode="numeric"
               style="width:7rem;font-size:1.5rem;font-weight:700;background:transparent;border:none;border-bottom:2px dashed #9ca3af;outline:none;text-align:right;color:#0072CE;font-family:inherit;padding:0">
        <span style="font-size:1.125rem;font-weight:500;color:#6b7280">kr</span>
      </div>
      <input type="range" id="skbdag-lon" min="0" max="120000" step="100" value="${DEFAULT_LÖN}"
             class="skbdag-slider" style="width:100%">
      <p style="font-size:.75rem;color:#9ca3af;margin-top:4px">Dra för att ändra, eller klicka på beloppet och skriv in</p>
    </fieldset>
  </div>
</section>

<section id="skbdag-resultat" class="mb-6">
</section>
`;

/* ── Result renderer ──────────────────────────────────────────────── */

function visaResultat(container, uppdelning, år) {
  const skattesats = rapportskattesats(uppdelning);
  const datum = beräknaDag(skattesats, år);
  const datumStr = formateraDatum(datum);
  const dagNr = dagNummer(datum);
  const skattPct = (skattesats * 100).toFixed(1);
  const fritt = ((1 - skattesats) * 100).toFixed(1);
  const skatteAndel = (dagNr / dagarPåÅret(år) * 100).toFixed(1);

  container.innerHTML = `
    <div style="background:#f3f4f6;border-radius:12px;padding:24px 24px 20px;text-align:center">
      <p style="font-size:1rem;color:#555;margin:0 0 4px;font-weight:500">Din Skattebetalardag ${ år }</p>
      <p style="font-size:clamp(2rem,5vw,3.5rem);font-weight:800;color:#0072CE;margin:0 0 4px;line-height:1.15">${ datumStr }</p>
      <p style="font-size:.95rem;color:#555;margin:0 0 20px">
        Från och med denna dag arbetar du för stat och kommun. Totalt skattetryck: <strong>${ skattPct }%</strong>
      </p>

      <div style="position:relative;margin:0 auto;max-width:640px">
        <div style="display:flex;height:40px;border-radius:8px;overflow:hidden;font-size:.8rem;font-weight:600;color:#fff">
          <div style="width:${ fritt }%;background:#2BA784;display:flex;align-items:center;justify-content:center;min-width:30px">
            ${ fritt }% kvar
          </div>
          <div style="flex:1;background:#F9423A;display:flex;align-items:center;justify-content:center;min-width:30px">
            ${ skattPct }% skatt
          </div>
        </div>
        <div style="display:flex;justify-content:space-between;margin-top:6px;font-size:.7rem;color:#888">
          ${ MÅNADER.map(m => `<span>${m}</span>`).join('') }
        </div>
        <div style="position:absolute;top:-6px;left:${ fritt }%;transform:translateX(-50%)">
          <div style="width:2px;height:52px;background:#333"></div>
        </div>
      </div>
    </div>

    <div class="skbdag-figures" style="display:grid;grid-template-columns:repeat(4,auto);gap:4px 20px;margin-top:16px;justify-content:start">
      <div>
        <span style="font-size:.8rem;color:#666">Bruttolön/år</span><br>
        <span style="font-size:1.1rem;font-weight:700;color:#1a1a1a">${ formatera(uppdelning.årsinkomst) } kr</span>
      </div>
      <div>
        <span style="font-size:.8rem;color:#666">Arbetsgivarkostnad</span><br>
        <span style="font-size:1.1rem;font-weight:700;color:#1a1a1a">${ formatera(uppdelning.totalArbetsgivarkostnad) } kr</span>
      </div>
      <div>
        <span style="font-size:.8rem;color:#666">Netto efter skatt</span><br>
        <span style="font-size:1.1rem;font-weight:700;color:#1a1a1a">${ formatera(uppdelning.nettoÅrsinkomst) } kr</span>
      </div>
      <div>
        <span style="font-size:.8rem;color:#666">Varav moms</span><br>
        <span style="font-size:1.1rem;font-weight:700;color:#1a1a1a">${ formatera(uppdelning.moms) } kr</span>
      </div>
    </div>
    <style>
      @media(max-width:600px){
        #skattebetalardagen .skbdag-figures{grid-template-columns:repeat(2,auto)!important}
      }
    </style>
  `;
}

function visaNollläge(container) {
  container.innerHTML = `
    <div style="background:#f3f4f6;border-radius:12px;padding:24px;text-align:center">
      <p style="font-size:1rem;color:#888;margin:0">Ange en månadslön för att se din Skattebetalardag.</p>
    </div>
  `;
}

/* ── Init ──────────────────────────────────────────────────────────── */

function init() {
  const root = document.getElementById('skattebetalardagen');
  if (!root) return;

  root.innerHTML = TEMPLATE;

  const slider = root.querySelector('#skbdag-lon');
  const edit = root.querySelector('#skbdag-lon-edit');
  const kommunSelect = root.querySelector('#skbdag-komm');
  const resultatContainer = root.querySelector('#skbdag-resultat');
  const årSelect = root.querySelector('#skbdag-ar');

  // Fill year picker (newest first), honour data-ar attribute
  const harÅrAttribut = root.dataset.ar != null;
  const defaultÅr = Number(root.dataset.ar) || STANDARD_ÅR;
  const startLön = harÅrAttribut ? (GENOMSNITTSLÖN[defaultÅr] || DEFAULT_LÖN) : DEFAULT_LÖN;
  for (const år of Object.keys(INKOMSTÅR_DATA).sort((a, b) => b - a)) {
    const opt = document.createElement('option');
    opt.value = år;
    opt.textContent = år;
    if (Number(år) === defaultÅr) opt.selected = true;
    årSelect.appendChild(opt);
  }

  // Set up kommun search
  const uppdateraKommun = skapaVäljare({
    wrapper: root.querySelector('#skbdag-komm-wrapper'),
    input: root.querySelector('#skbdag-komm-search'),
    list: root.querySelector('#skbdag-komm-list'),
    select: kommunSelect,
  });

  function valdtÅr() { return Number(årSelect.value); }

  function uppdateraKommunlista() {
    uppdateraKommun(INKOMSTÅR_DATA[valdtÅr()].kommuner, k => k.namn, k => k.skattesats);
  }

  uppdateraKommunlista();

  // State
  let exaktLön = null;

  function beräkna() {
    const år = valdtÅr();
    const månadslön = exaktLön !== null ? exaktLön : Number(slider.value);
    if (!månadslön || månadslön <= 0) {
      visaNollläge(resultatContainer);
      return;
    }

    const kommunNamn = kommunSelect.options[kommunSelect.selectedIndex]?.text || 'Riksgenomsnitt';
    const skattesats = Number(kommunSelect.value);

    const uppdelning = beräknaSkatteuppdelning({
      månadslön,
      kommunalSkattesats: skattesats,
      kommunNamn,
    }, år);

    if (!uppdelning) {
      visaNollläge(resultatContainer);
      return;
    }

    visaResultat(resultatContainer, uppdelning, år);
  }

  function synkaFrånReglage() {
    exaktLön = null;
    edit.value = formatera(Number(slider.value));
    beräkna();
  }

  function synkaFrånInmatning() {
    let val = tolka(edit.value);
    if (isNaN(val) || val < 0) val = 0;
    if (val > 120000) val = 120000;
    exaktLön = val;
    slider.value = Math.round(val / 100) * 100;
    edit.value = formatera(val);
    beräkna();
  }

  slider.addEventListener('input', synkaFrånReglage);
  edit.addEventListener('change', synkaFrånInmatning);
  edit.addEventListener('blur', synkaFrånInmatning);

  let timer = null;
  edit.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      let val = tolka(edit.value);
      if (!isNaN(val) && val >= 0) {
        if (val > 120000) val = 120000;
        exaktLön = val;
        slider.value = Math.round(val / 100) * 100;
        beräkna();
      }
    }, 400);
  });

  edit.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      clearTimeout(timer);
      synkaFrånInmatning();
      edit.blur();
    }
  });

  kommunSelect.addEventListener('change', beräkna);
  årSelect.addEventListener('change', () => {
    uppdateraKommunlista();
    beräkna();
  });

  // Initial render — use year-specific average when shortcode sets ar="..."
  slider.value = startLön;
  edit.value = formatera(startLön);
  beräkna();
}

/* ── Boot ──────────────────────────────────────────────────────────── */

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
