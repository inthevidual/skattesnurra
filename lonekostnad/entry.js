/**
 * Vad kostar en anställd? — WordPress plugin.
 * Shortcode: [lonekostnad]
 *
 * Type in (or drag) a monthly gross salary and see the total cost to the
 * employer, broken down into the seven components of arbetsgivaravgifterna.
 */

/* ── Data ───────────────────────────────────────────────────────────── */
//
// Arbetsgivaravgifternas sju delavgifter, i procent av bruttolönen.
// Källa: Skatteverket (rättslig vägledning) samt Ekonomifakta.
// Den totala avgiften är 31,42 % båda åren; fördelningen mellan
// delavgifterna ändrades 2026 (föräldra-, efterlevande- och
// arbetsskadeavgiften sänktes, den allmänna löneavgiften höjdes lika
// mycket, så att summan är oförändrad).

const DELAVGIFTER = {
  2026: [
    { namn: 'Ålderspensionsavgift',     sats: 10.21 },
    { namn: 'Allmän löneavgift',        sats: 12.62 },
    { namn: 'Sjukförsäkringsavgift',    sats: 3.55 },
    { namn: 'Arbetsmarknadsavgift',     sats: 2.64 },
    { namn: 'Föräldraförsäkringsavgift', sats: 2.00 },
    { namn: 'Efterlevandepensionsavgift', sats: 0.30 },
    { namn: 'Arbetsskadeavgift',        sats: 0.10 },
  ],
  2025: [
    { namn: 'Ålderspensionsavgift',     sats: 10.21 },
    { namn: 'Allmän löneavgift',        sats: 11.62 },
    { namn: 'Sjukförsäkringsavgift',    sats: 3.55 },
    { namn: 'Arbetsmarknadsavgift',     sats: 2.64 },
    { namn: 'Föräldraförsäkringsavgift', sats: 2.60 },
    { namn: 'Efterlevandepensionsavgift', sats: 0.60 },
    { namn: 'Arbetsskadeavgift',        sats: 0.20 },
  ],
};

const STANDARD_ÅR = 2026;
const DEFAULT_LÖN = 35000;
const MAX_LÖN = 200000;

// Typ av anställd. Olika kategorier ger nedsatt arbetsgivaravgift:
//  • pensionär — endast ålderspensionsavgiften (10,21 %) betalas, ingen
//    åldersgräns i kr. Gäller den som vid årets ingång fyllt 66 år (2025)
//    respektive 67 år (2026).
//  • ung — tillfällig nedsättning 1 april 2026–30 sep 2027 för födda
//    2003–2007: ålderspensionsavgift + halva övriga avgifter (totalt
//    20,81 %) på lön upp till 25 000 kr/mån, full avgift därutöver.
const UNG_TAK = 25000;

const KATEGORIER = {
  standard: {
    namn: 'Anställd (standard)',
    år: [2025, 2026],
    not: () => '',
  },
  pensionar: {
    namn: 'Ålderspensionär',
    år: [2025, 2026],
    not: år => `Endast ålderspensionsavgift (10,21 %) betalas för anställda som vid årets ingång fyllt ${år >= 2026 ? 67 : 66} år.`,
  },
  ung: {
    namn: 'Ung (18–22 år)',
    år: [2026],
    not: () => `Tillfällig nedsättning 1 april 2026–30 sep 2027 för födda 2003–2007: halverade avgifter på lön upp till ${formateraInmatning(UNG_TAK)} kr/mån, full avgift därutöver.`,
  },
};

// Faktor per delavgift och tak (i kr/mån) för respektive kategori.
function kategorikonfig(kategori) {
  if (kategori === 'pensionar') {
    return { faktor: d => (d.namn === 'Ålderspensionsavgift' ? 1 : 0), tak: Infinity };
  }
  if (kategori === 'ung') {
    return { faktor: d => (d.namn === 'Ålderspensionsavgift' ? 1 : 0.5), tak: UNG_TAK };
  }
  return { faktor: () => 1, tak: Infinity };
}

function tillgängligaKategorier(år) {
  return Object.entries(KATEGORIER)
    .filter(([, k]) => k.år.includes(år))
    .map(([id]) => id);
}

/* ── Helpers ────────────────────────────────────────────────────────── */

function formatKr(n) {
  return Math.round(n).toLocaleString('sv-SE').replace(/ /g, ' ');
}

function formatProcent(n) {
  return n.toFixed(2).replace('.', ',');
}

function formateraInmatning(n) {
  return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

function tolkVärde(s) {
  return Number(s.replace(/\s/g, ''));
}

/* ── Slider CSS ─────────────────────────────────────────────────────── */

const SLIDER_CSS = `
input[type="range"].brand-slider {
  -webkit-appearance: none;
  appearance: none;
  height: 10px;
  border-radius: 5px;
  background: #0072CE;
  outline: none;
  cursor: pointer;
}
input[type="range"].brand-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 22px; height: 28px;
  border-radius: 4px;
  background: #f5f5f5;
  border: 1px solid #ccc;
  box-shadow: 0 1px 3px rgba(0,0,0,0.2);
  cursor: grab;
}
input[type="range"].brand-slider::-webkit-slider-thumb:active {
  cursor: grabbing; background: #e8e8e8;
}
input[type="range"].brand-slider::-moz-range-thumb {
  width: 22px; height: 28px;
  border-radius: 4px;
  background: #f5f5f5;
  border: 1px solid #ccc;
  box-shadow: 0 1px 3px rgba(0,0,0,0.2);
  cursor: grab;
}
input[type="range"].brand-slider::-moz-range-thumb:active {
  cursor: grabbing; background: #e8e8e8;
}
input[type="range"].brand-slider::-moz-range-track {
  height: 10px; border-radius: 5px;
  background: #0072CE; border: none;
}
`;

/* ── HTML template ──────────────────────────────────────────────────── */

function template() {
  const årsval = Object.keys(DELAVGIFTER)
    .sort((a, b) => b - a)
    .map(år => `<option value="${år}"${Number(år) === STANDARD_ÅR ? ' selected' : ''}>${år}</option>`)
    .join('');

  return `
<div class="py-4">

  <section class="mb-8">
    <h2 class="text-2xl sm:text-3xl font-bold mb-4">Vad kostar en anställd?</h2>
    <p class="mb-2">En anställd kostar mer än lönen. Utöver bruttolönen betalar arbetsgivaren <strong>arbetsgivaravgifter</strong> på 31,42&nbsp;procent. Ange en månadslön så ser du den totala lönekostnaden och hur den fördelas.</p>
  </section>

  <section class="bg-gray-100 rounded-lg p-4 sm:p-6 mb-8">
    <div class="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6 mb-2">
      <div class="flex items-center gap-2">
        <label for="lonekostnad-ar" class="text-base font-medium">Inkomstår:</label>
        <select id="lonekostnad-ar" class="rounded border border-gray-300 px-3 py-2 text-base bg-white">${årsval}</select>
      </div>
      <div class="flex items-center gap-2">
        <label for="lonekostnad-typ" class="text-base font-medium">Typ av anställd:</label>
        <select id="lonekostnad-typ" class="rounded border border-gray-300 px-3 py-2 text-base bg-white"></select>
      </div>
    </div>
    <p id="lonekostnad-not" class="text-xs text-gray-500 mb-4 min-h-[1rem]"></p>

    <fieldset>
      <label class="block text-base font-medium mb-1">Månadslön (brutto):</label>
      <div class="flex items-baseline gap-1 mb-2">
        <input type="text" id="lonekostnad-edit" inputmode="numeric"
               class="w-44 text-3xl font-bold bg-transparent border-b-2 border-dashed border-gray-400 focus:border-blue-600 outline-none cursor-text transition-colors text-right"
               style="color:#0072CE">
        <span class="text-xl font-medium text-gray-500">kr</span>
      </div>
      <input type="range" id="lonekostnad-slider" min="0" max="${MAX_LÖN}" step="1000" value="${DEFAULT_LÖN}"
             class="brand-slider w-full">
      <div class="flex justify-between text-xs text-gray-400 mt-1">
        <span>0</span>
        <span>${formateraInmatning(MAX_LÖN)}</span>
      </div>
      <p class="text-xs text-gray-400 mt-1">Dra för jämna tusental, klicka och fyll i för exakt lön</p>
    </fieldset>
  </section>

  <section id="lonekostnad-resultat" aria-live="polite" class="mb-8"></section>

  <section class="bg-gray-50 border border-gray-200 rounded-lg p-4 sm:p-6 mb-8">
    <h3 class="text-lg font-semibold mb-3">Bra att veta</h3>
    <div class="text-sm text-gray-700 leading-relaxed space-y-3">
      <p>Arbetsgivaravgifterna består av sju delavgifter. Den totala avgiften är 31,42&nbsp;procent av bruttolönen, men fördelningen mellan delavgifterna kan ändras mellan åren utan att totalen påverkas.</p>
      <p>Beräkningen visar den lagstadgade lönekostnaden. Utöver detta tillkommer ofta avtalade kostnader som tjänstepension, försäkringar och semesterersättning, vilka varierar mellan branscher och kollektivavtal.</p>
      <p>För anställda som vid årets ingång fyllt 67&nbsp;år betalar arbetsgivaren endast ålderspensionsavgift, 10,21&nbsp;procent. För ungdomar gäller under vissa perioder en tillfälligt nedsatt avgift.</p>
      <p>Den allmänna löneavgiften är formellt en del av arbetsgivaravgifterna men fungerar i praktiken som en skatt — den är inte kopplad till någon förmån för den anställde.</p>
    </div>
  </section>

</div>
`;
}

/* ── Calculation ────────────────────────────────────────────────────── */

function beräkna(månadslön, år, kategori) {
  const { faktor, tak } = kategorikonfig(kategori);
  const underTak = Math.min(månadslön, tak);   // lönedel med nedsatt avgift
  const överTak = Math.max(0, månadslön - tak); // lönedel med full avgift

  const poster = DELAVGIFTER[år]
    .map(d => {
      const nedsattSats = d.sats * faktor(d);
      const belopp = nedsattSats / 100 * underTak + d.sats / 100 * överTak;
      return {
        namn: d.namn,
        belopp,
        // Effektiv andel av bruttolönen — sammanfaller med den lagstadgade
        // satsen för standard/pensionär och för ung under taket, men blir
        // en blandning ovanför taket.
        effektivSats: månadslön > 0 ? belopp / månadslön * 100 : 0,
      };
    })
    .filter(p => p.belopp > 0);

  const avgifter = poster.reduce((s, p) => s + p.belopp, 0);
  return {
    bruttolön: månadslön,
    poster,
    avgifter,
    effektivSats: månadslön > 0 ? avgifter / månadslön * 100 : 0,
    totalKostnad: månadslön + avgifter,
    takÖverskridet: kategori === 'ung' && månadslön > tak,
    tak,
  };
}

/* ── Rendering ──────────────────────────────────────────────────────── */

const FÄRG_LÖN = '#2BA784';     // brand green — pengar till den anställde
const FÄRG_AVGIFT = '#5C5D6E';  // brand slate — arbetsgivaravgifter

function visaNolläge(container) {
  container.innerHTML = `
    <div class="bg-gray-100 rounded-lg p-4 sm:p-6 text-center text-gray-400">
      <p class="text-lg font-medium">Ange en månadslön för att se vad den anställde kostar.</p>
    </div>`;
}

function visaResultat(container, månadslön, år, kategori) {
  const r = beräkna(månadslön, år, kategori);
  const lönPct = r.bruttolön / r.totalKostnad * 100;
  const avgiftPct = r.avgifter / r.totalKostnad * 100;

  let html = '';

  // ── Headline ──────────────────────────────────────────────────────
  html += `<div class="text-center mb-6">
    <p class="text-base text-gray-500 mb-1">Total lönekostnad per månad</p>
    <p class="text-4xl sm:text-5xl font-bold" style="color:${FÄRG_AVGIFT}">${formatKr(r.totalKostnad)} kr</p>
    <p class="text-base text-gray-400 mt-2">varav ${formatKr(r.avgifter)} kr i arbetsgivaravgifter
      (${formatProcent(r.effektivSats)} %)</p>
  </div>`;

  // ── Stacked bar: lön vs avgifter ──────────────────────────────────
  html += `<div class="mb-2">
    <div class="flex h-12 rounded-lg overflow-hidden">
      <div style="width:${lönPct}%;background:${FÄRG_LÖN}"
           class="h-full flex items-center justify-center text-white text-sm font-semibold transition-all">
        ${lönPct >= 12 ? formatProcent(lönPct).replace(',00', '') + ' %' : ''}
      </div>
      <div style="width:${avgiftPct}%;background:${FÄRG_AVGIFT}"
           class="h-full flex items-center justify-center text-white text-sm font-semibold transition-all">
        ${avgiftPct >= 10 ? formatProcent(avgiftPct).replace(',00', '') + ' %' : ''}
      </div>
    </div>
    <div class="flex flex-col sm:flex-row gap-x-6 gap-y-1 mt-3 mb-6 text-sm">
      <div class="flex items-center gap-2">
        <span class="inline-block w-3 h-3 rounded-sm flex-shrink-0" style="background:${FÄRG_LÖN}"></span>
        <span><span class="font-semibold">Bruttolön</span> — ${formatKr(r.bruttolön)} kr</span>
      </div>
      <div class="flex items-center gap-2">
        <span class="inline-block w-3 h-3 rounded-sm flex-shrink-0" style="background:${FÄRG_AVGIFT}"></span>
        <span><span class="font-semibold">Arbetsgivaravgifter</span> — ${formatKr(r.avgifter)} kr</span>
      </div>
    </div>
  </div>`;

  // ── Component table ───────────────────────────────────────────────
  html += `<div class="bg-white border border-gray-300 rounded-lg p-4 sm:p-6 shadow-sm">`;
  html += `<h3 class="text-lg font-bold mb-4">Så fördelas arbetsgivaravgifterna</h3>`;
  html += `<table class="w-full text-sm sm:text-base">`;
  html += `<thead><tr class="text-gray-500 text-xs sm:text-sm uppercase tracking-wide">
    <th class="text-left font-semibold pb-2">Delavgift</th>
    <th class="text-right font-semibold pb-2">Procent</th>
    <th class="text-right font-semibold pb-2">Kr/mån</th>
  </tr></thead><tbody>`;

  r.poster.forEach((p, i) => {
    const bg = i % 2 === 0 ? '' : 'bg-gray-100';
    html += `<tr class="border-t border-gray-200 ${bg}">
      <td class="py-2.5 font-medium text-gray-800">${p.namn}</td>
      <td class="py-2.5 text-right tabular-nums text-gray-600">${formatProcent(p.effektivSats)} %</td>
      <td class="py-2.5 text-right font-semibold tabular-nums text-gray-900">${formatKr(p.belopp)} kr</td>
    </tr>`;
  });

  // Summa arbetsgivaravgifter
  html += `<tr class="border-t-2 border-gray-400">
    <td class="py-2.5 font-bold text-gray-900">Summa arbetsgivaravgifter</td>
    <td class="py-2.5 text-right font-bold tabular-nums text-gray-700">${formatProcent(r.effektivSats)} %</td>
    <td class="py-2.5 text-right font-bold tabular-nums text-gray-900">${formatKr(r.avgifter)} kr</td>
  </tr>`;

  // Bruttolön
  html += `<tr class="border-t border-gray-200">
    <td class="py-2.5 font-medium text-gray-800">Bruttolön</td>
    <td class="py-2.5"></td>
    <td class="py-2.5 text-right font-semibold tabular-nums text-gray-900">${formatKr(r.bruttolön)} kr</td>
  </tr>`;

  // Total
  html += `<tr class="border-t-2 border-gray-900">
    <td class="py-3 font-bold text-gray-900">Total lönekostnad</td>
    <td class="py-3"></td>
    <td class="py-3 text-right font-bold tabular-nums" style="color:${FÄRG_AVGIFT}">${formatKr(r.totalKostnad)} kr</td>
  </tr>`;

  html += `</tbody></table>`;
  if (r.takÖverskridet) {
    html += `<p class="text-xs text-gray-400 mt-3">Nedsatt avgift gäller lön upp till ${formateraInmatning(r.tak)} kr/mån; på överskjutande del betalas full avgift (31,42 %).</p>`;
  }
  html += `<p class="text-xs text-gray-400 mt-1">Motsvarar ${formatKr(r.totalKostnad * 12)} kr per år.</p>`;
  html += `</div>`;

  container.innerHTML = html;
}

/* ── Init ───────────────────────────────────────────────────────────── */

function init() {
  const container = document.getElementById('lonekostnad');
  if (!container) return;

  // Load fonts
  if (!document.querySelector('link[href*="fonts.googleapis.com"][href*="Inter"]')) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700&display=swap';
    document.head.appendChild(link);
  }

  // Inject slider CSS
  if (!document.getElementById('lonekostnad-slider-css')) {
    const style = document.createElement('style');
    style.id = 'lonekostnad-slider-css';
    style.textContent = SLIDER_CSS;
    document.head.appendChild(style);
  }

  container.innerHTML = template();

  const slider = document.getElementById('lonekostnad-slider');
  const edit = document.getElementById('lonekostnad-edit');
  const årSelect = document.getElementById('lonekostnad-ar');
  const typSelect = document.getElementById('lonekostnad-typ');
  const notElement = document.getElementById('lonekostnad-not');
  const resultat = document.getElementById('lonekostnad-resultat');

  let exaktVärde = null;

  function aktuellLön() {
    return exaktVärde !== null ? exaktVärde : Number(slider.value);
  }

  // Fyll typväljaren med de kategorier som gäller för året, och behåll
  // tidigare val om det fortfarande är tillgängligt (annars 'standard').
  function fyllTypväljare(år) {
    const tidigare = typSelect.value;
    const ids = tillgängligaKategorier(år);
    typSelect.innerHTML = ids
      .map(id => `<option value="${id}">${KATEGORIER[id].namn}</option>`)
      .join('');
    typSelect.value = ids.includes(tidigare) ? tidigare : 'standard';
  }

  function uppdateraNot() {
    const år = Number(årSelect.value);
    notElement.textContent = KATEGORIER[typSelect.value].not(år);
  }

  function uppdatera() {
    const lön = aktuellLön();
    const år = Number(årSelect.value);
    if (lön > 0) {
      visaResultat(resultat, lön, år, typSelect.value);
    } else {
      visaNolläge(resultat);
    }
  }

  function synkaFrånReglage() {
    exaktVärde = null;
    edit.value = formateraInmatning(Number(slider.value));
    uppdatera();
  }

  function synkaFrånInmatning() {
    let val = tolkVärde(edit.value);
    if (isNaN(val) || val < 0) val = 0;
    if (val > MAX_LÖN) val = MAX_LÖN;
    exaktVärde = val;
    slider.value = Math.round(val / 1000) * 1000;
    edit.value = formateraInmatning(val);
    uppdatera();
  }

  slider.addEventListener('input', synkaFrånReglage);
  edit.addEventListener('change', synkaFrånInmatning);
  edit.addEventListener('blur', synkaFrånInmatning);

  let inmatningsTimer = null;
  edit.addEventListener('input', () => {
    clearTimeout(inmatningsTimer);
    inmatningsTimer = setTimeout(() => {
      let val = tolkVärde(edit.value);
      if (!isNaN(val) && val >= 0) {
        if (val > MAX_LÖN) val = MAX_LÖN;
        exaktVärde = val;
        slider.value = Math.round(val / 1000) * 1000;
        uppdatera();
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

  årSelect.addEventListener('change', () => {
    fyllTypväljare(Number(årSelect.value));
    uppdateraNot();
    uppdatera();
  });

  typSelect.addEventListener('change', () => {
    uppdateraNot();
    uppdatera();
  });

  // Initial render with default value
  fyllTypväljare(Number(årSelect.value));
  uppdateraNot();
  edit.value = formateraInmatning(Number(slider.value));
  uppdatera();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
