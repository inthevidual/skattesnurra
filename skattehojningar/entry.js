/**
 * Så mycket höjs din skatt — WordPress plugin.
 * Shortcode: [skattehojningar]
 *
 * Räknar ut hur mycket skatten höjs för användaren med de skattehöjningar
 * som S, V och MP föreslagit inför valet 2026, baserat på lön, sparande,
 * boende och konsumtion. Källa: partiernas budgetmotioner för 2026 m.m.
 * — se KÄLLOR nedan.
 */

/* ── Helpers ────────────────────────────────────────────────────────── */

function formatKr(n) {
  return Math.round(n).toLocaleString('sv-SE') + ' kr';
}

function formateraInmatning(n) {
  return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

function tolkVärde(s) {
  return Number(String(s).replace(/\s/g, ''));
}

function clamp(x, lo, hi) {
  return Math.min(hi, Math.max(lo, x));
}

/* ── Partifärger ────────────────────────────────────────────────────── */

const PARTI = {
  S:  { namn: 'Socialdemokraterna', färg: '#F4A6A6', text: '#7A1420', ljus: '#FDECEC' }, // ljusröd
  V:  { namn: 'Vänsterpartiet',     färg: '#8B1A1A', text: '#FFFFFF', ljus: '#F5E4E4' }, // mörkröd
  MP: { namn: 'Miljöpartiet',       färg: '#A9D18E', text: '#2B4A1C', ljus: '#EFF7E8' }, // ljusgrön
};

// Trefärgad kantlist för det gemensamma förslaget: S, V och MP i följd.
const TREFÄRGAD =
  `linear-gradient(to bottom, ${PARTI.S.färg} 0 33.4%, ${PARTI.V.färg} 33.4% 66.7%, ${PARTI.MP.färg} 66.7% 100%)`;

/* ── Skatteparametrar 2026 ──────────────────────────────────────────── */
//
// Alla belopp i kr om inget annat anges. Se KÄLLOR för hänvisningar.

// Jobbskatteavdraget 2026 (inkl. regeringens förstärkning i BP26).
const JSA_MAX_PER_ÅR = 52392;          // ca 4 366 kr/mån vid full effekt

// MP: nytt steg i statlig inkomstskatt ("värnskatt") över 70 000 kr/mån
// enligt budgetmotionen 2025/26:3770. Satsen anges inte i motionen —
// 5 procentenheter antas utifrån MP:s skuggbudget för 2025.
const MP_VÄRNSKATT_GRÄNS_MÅN = 70000;
const MP_VÄRNSKATT_SATS = 0.05;

// S: återinförd avtrappning av jobbskatteavdraget med 3 % av inkomsten
// över 66 750 kr/mån (motionens gräns; motsvarar 13,54 prisbasbelopp).
const S_AVTRAPPNING_GRÄNS_ÅR = 66750 * 12;
const S_AVTRAPPNING_SATS = 0.03;

// V: beredskapsskatt +5 procentenheter över 65 000 kr/mån samt utfasning
// av jobbskatteavdraget mellan 50 000 och 100 000 kr/mån ("V classic",
// budgetmotionen). Enligt Dadgostars besked i augusti 2026 vill partiet
// dock inte längre höja skatten för någon under 67 000 kr/mån — modelleras
// som samma paket med nedre gräns 67 000 kr/mån ("V light", default).
const V_BEREDSKAP_GRÄNS_MÅN = 65000;
const V_BEREDSKAP_SATS = 0.05;
const V_UTFASNING_START_MÅN = 50000;
const V_UTFASNING_SLUT_MÅN = 100000;
const V_LIGHT_GRÄNS_MÅN = 67000;

// ISK 2026: schablonränta 3,55 % (SLR 2,55 % + 1 pe), 30 % skatt
// → effektiv skatt 1,065 % av kapitalunderlaget. Fribelopp 300 000 kr.
const ISK_EFFEKTIV_SKATT = 0.0355 * 0.30;
const ISK_FRIBELOPP_NU = 300000;
const ISK_FRIBELOPP_SVMP = 50000;      // MP:s och V:s sänkta fribelopp
const S_ISK_GRÄNS = 3000000;           // S: tredje nivå över 3 mkr
const S_ISK_EXTRA = 0.01 * 0.30;       // schablonen höjs med 1 pe → +0,3 %
const V_ISK_TAK = 2000000;             // V: konventionell beskattning över 2 mkr
const ANTAGEN_AVKASTNING = 0.06;       // antagande för V:s tak (30 % på avkastningen)

// Flygskatt per enkelresa: 2025 års nivåer (avskaffade 1 juli 2025),
// förordning 2024:924. MP vill återinföra och dubblera nivåerna.
const FLYGSKATT = {
  europa: { label: 'Inom Europa', v: 77, mp: 154 },
  medel:  { label: 'Utom Europa, upp till 600 mil', v: 323, mp: 646 },
  lång:   { label: 'Långdistans, över 600 mil', v: 517, mp: 1034 },
};

// MP: höjd koldioxidskatt och reduktionsplikt — sammantagen priseffekt
// vid pump ca 2,20 kr/liter. Genomsnittsförbrukning 0,82 l/mil.
const MP_DRIVMEDEL_PER_LITER = 2.20;
const FÖRBRUKNING_L_PER_MIL = 0.82;

// Bankskatt (S, V och MP): ca 2 333 kr/år per miljon i bolån enligt
// Skattebetalarnas beräkning (7 000 kr/år vid 3 mkr i lån).
const BANKSKATT_PER_MILJON = 2333;

// RUT- och ROT-avdragens tak 2026 (Skatteverket): högst 75 000 kr per
// person och år sammanlagt, varav ROT högst 50 000 kr.
const RUTROT_TAK_TOTAL = 75000;
const RUTROT_TAK = { rut: 75000, rot: 50000 };

// V: återinförd fastighetsskatt enligt tidigare förslag — 1,5 % på
// taxeringsvärde över 5 mkr, 2,5 % över 7 mkr. (Begränsningsregeln på
// 4 % av inkomsten ingår inte: den gäller på hushållsnivå och går inte
// att räkna på individuppgifter.) Användaren anger marknadsvärde;
// taxeringsvärdet är 75 % av marknadsvärdet.
const V_FSK_GRÄNS_1 = 5000000;
const V_FSK_GRÄNS_2 = 7000000;
const V_FSK_SATS_1 = 0.015;
const V_FSK_SATS_2 = 0.025;
const TAXERINGSVÄRDE_AV_MARKNADSVÄRDE = 0.75;

/* ── Beräkningar ────────────────────────────────────────────────────── */

/**
 * Alla beräkningar utifrån användarens situation.
 * @param {object} inp {lön, isk, bolån, marknad, mil, flyg, flygTyp, rut, rot}
 * @returns {object} kr/år per förslag
 */
function beräkna(inp) {
  const årslön = inp.lön * 12;

  // MP
  const mpVärnskatt = 12 * MP_VÄRNSKATT_SATS * Math.max(0, inp.lön - MP_VÄRNSKATT_GRÄNS_MÅN);
  const mpIsk = Math.max(0, Math.min(inp.isk, ISK_FRIBELOPP_NU) - ISK_FRIBELOPP_SVMP) * ISK_EFFEKTIV_SKATT;
  const mpFlyg = inp.flyg * FLYGSKATT[inp.flygTyp].mp;
  const mpDrivmedel = inp.mil * FÖRBRUKNING_L_PER_MIL * MP_DRIVMEDEL_PER_LITER;

  // S
  const sAvtrappning = Math.min(
    S_AVTRAPPNING_SATS * Math.max(0, årslön - S_AVTRAPPNING_GRÄNS_ÅR),
    JSA_MAX_PER_ÅR,
  );
  const sIsk = Math.max(0, inp.isk - S_ISK_GRÄNS) * S_ISK_EXTRA;

  // V — beredskapsskatt + JSA-utfasning i två varianter: "light" (besked
  // aug 2026, allt börjar vid 67 000 kr/mån) och "classic" (budgetmotionen).
  const vPaket = (beredskapGräns, utfasningStart) =>
    12 * V_BEREDSKAP_SATS * Math.max(0, inp.lön - beredskapGräns)
    + JSA_MAX_PER_ÅR * clamp(
      (inp.lön - utfasningStart) / (V_UTFASNING_SLUT_MÅN - utfasningStart), 0, 1,
    );
  const vLight = vPaket(V_LIGHT_GRÄNS_MÅN, V_LIGHT_GRÄNS_MÅN);
  const vClassic = vPaket(V_BEREDSKAP_GRÄNS_MÅN, V_UTFASNING_START_MÅN);
  const vIskFribelopp = Math.max(0, Math.min(inp.isk, ISK_FRIBELOPP_NU) - ISK_FRIBELOPP_SVMP) * ISK_EFFEKTIV_SKATT;
  const vIskTak = Math.max(0, inp.isk - V_ISK_TAK) * (0.30 * ANTAGEN_AVKASTNING - ISK_EFFEKTIV_SKATT);
  const vFlyg = inp.flyg * FLYGSKATT[inp.flygTyp].v;
  const taxv = inp.marknad * TAXERINGSVÄRDE_AV_MARKNADSVÄRDE;
  const vFastighet = V_FSK_SATS_1 * clamp(taxv - V_FSK_GRÄNS_1, 0, V_FSK_GRÄNS_2 - V_FSK_GRÄNS_1)
    + V_FSK_SATS_2 * Math.max(0, taxv - V_FSK_GRÄNS_2);

  // Gemensamt
  const bankskatt = (inp.bolån / 1000000) * BANKSKATT_PER_MILJON;

  return {
    mpVärnskatt, mpIsk, mpFlyg, mpDrivmedel,
    sAvtrappning, sIsk,
    vBeredskapUtfasning: vLight,
    vBeredskapUtfasningClassic: vClassic,
    vIsk: vIskFribelopp + vIskTak,
    vFlyg, vFastighet,
    vRut: inp.rut,
    vRot: inp.rot,
    bankskatt,
  };
}

/* ── Förslagen (tabellrader) ────────────────────────────────────────── */
//
// OBS: fotnotssiffrorna i `källor` pekar på källförteckningen som lever i
// värdsidan (WordPress-inläggets brödtext resp. index.html), inte i pluginet
// — håll numreringen synkad om källistan ändras. Nuvarande numrering:
//  1 MP budgetmotion 2025/26:3770 · 2 MP skuggbudget 2025 (SkU1y)
//  3 S budgetmotion 2026 · 4 Yttr. 2025/26:SkU1y
//  5 V budgetmotion 2026 · 6 V motion 2023/24:2321 (fastighetsskatt)
//  7 Förordning 2024:924 (flygskatt) · 8 Skattebetalarna om bankskatt
//  9 Placera om S ISK-förslag · 10 MP vårbudgetmotion 2026 (mot. 2025/26:4118)
// 11 SvD våren 2026 · 12 Aftonbladet 28 aug 2026 (V:s besked om 67 000-gränsen)
//
// mkr = offentligfinansiell effekt enligt partiernas egna budgetmotioner.
// nyckel = fält i beräkningsresultatet, null = går ej att beräkna individuellt.

const FÖRSLAG = [
  // S
  { parti: 'S', namn: 'Återinförd avtrappning av jobbskatteavdraget', detalj: '3 % av inkomsten över 66 750 kr/mån',
    mkr: 4660, nyckel: 'sAvtrappning', källor: [3, 4] },
  { parti: 'S', namn: 'Höjd skatt på ISK', detalj: 'Tredje beskattningsnivå på sparande över 3 mkr',
    mkr: 3500, nyckel: 'sIsk', källor: [3, 9] },
  { parti: 'S', namn: 'Miljonärsskatt/beredskapsskatt', detalj: 'Aviserad men ännu inte preciserad',
    mkr: null, nyckel: null, källor: [11] },
  { parti: 'S', namn: 'Höjd skatt på fåmansbolag (3:12)', detalj: 'Berör företagare med kvalificerade andelar',
    mkr: 1010, nyckel: null, källor: [3] },

  // V — inkomstskattepaketet finns i två varianter som utesluter varandra:
  // "V light" (Dadgostars besked aug 2026, default) och "V classic"
  // (budgetmotionen). `utesluter` = nyckel som slås av när raden slås på.
  { parti: 'V', chip: 'V_LIGHT', namn: 'Beredskapsskatt och utfasat jobbskatteavdrag', detalj: 'Enligt beskedet i augusti 2026 höjs skatten först från 67 000 kr/mån: +5 procentenheter och utfasat jobbskatteavdrag (67 000–100 000 kr/mån)',
    mkr: null, nyckel: 'vBeredskapUtfasning', utesluter: 'vBeredskapUtfasningClassic', källor: [5, 12] },
  { parti: 'V', chip: 'V_CLASSIC', namn: 'Beredskapsskatt och utfasat jobbskatteavdrag', detalj: 'Enligt budgetmotionen: +5 procentenheter över 65 000 kr/mån, jobbskatteavdraget fasas ut mellan 50 000 och 100 000 kr/mån',
    mkr: 37000, nyckel: 'vBeredskapUtfasningClassic', utesluter: 'vBeredskapUtfasning', standardAv: true, källor: [5, 4] },
  { parti: 'V', namn: 'Höjd skatt på ISK', detalj: 'Fribeloppet sänks till 50 000 kr, vanlig kapitalskatt över 2 mkr',
    mkr: 12800, nyckel: 'vIsk', källor: [5] },
  { parti: 'V', namn: 'Återinförd flygskatt', detalj: '2025 års nivåer, 77–517 kr per resa',
    mkr: 2000, nyckel: 'vFlyg', källor: [5, 7] },
  { parti: 'V', namn: 'Återinförd fastighetsskatt', detalj: '1,5 % på taxeringsvärde över 5 mkr (ca 6,7 mkr i marknadsvärde), 2,5 % över 7 mkr (ca 9,3 mkr)',
    mkr: 4200, nyckel: 'vFastighet', källor: [5, 6] },
  { parti: 'V', namn: 'Avskaffat RUT-avdrag', detalj: 'Hela avdraget slopas',
    mkr: 8300, nyckel: 'vRut', källor: [5] },
  { parti: 'V', namn: 'Omgjort och sänkt ROT-avdrag', detalj: 'Endast energibesparande renoveringar ("grönt ROT")',
    mkr: 6200, nyckel: 'vRot', källor: [5] },
  { parti: 'V', namn: 'Höjd skatt på avfallsförbränning', detalj: 'Betalas indirekt via el-, värme- och avfallsräkningar',
    mkr: 520, nyckel: null, källor: [5] },
  { parti: 'V', namn: 'Återinförd arvs- och gåvoskatt', detalj: 'Utformning inte preciserad',
    mkr: 3700, nyckel: null, källor: [5] },

  // MP
  { parti: 'MP', namn: 'Återinförd värnskatt', detalj: '5 procentenheter över 70 000 kr/mån (satsen antagen från MP:s budget 2025)',
    mkr: 12000, nyckel: 'mpVärnskatt', källor: [1, 2] },
  { parti: 'MP', namn: 'Höjd skatt på ISK', detalj: 'Fribeloppet sänks till 50 000 kr, därtill ökad progressivitet (ej preciserad, ingår inte i beräkningen)',
    mkr: 11200, nyckel: 'mpIsk', källor: [1] },
  { parti: 'MP', namn: 'Återinförd och dubblad flygskatt', detalj: '154–1 034 kr per resa, 20 000 kr för privatjet',
    mkr: 3500, nyckel: 'mpFlyg', källor: [1, 7] },
  { parti: 'MP', namn: 'Höjd koldioxidskatt och reduktionsplikt', detalj: 'Ca 2,20 kr/liter i höjt pris vid pump',
    mkr: 4050, nyckel: 'mpDrivmedel', källor: [1] },
  { parti: 'MP', namn: 'Förmögenhetsskatt på miljardärer', detalj: 'Endast förmögenheter över en miljard kr',
    mkr: 50000, nyckel: null, källor: [10] },
  { parti: 'MP', namn: 'Antibiotikaskatt', detalj: 'Betalas indirekt via priset på kött',
    mkr: 835, nyckel: null, källor: [1] },

  // Gemensamt
  { parti: 'ALLA', namn: 'Bolåneskatt (extra bankskatt)', detalj: 'Skatt på bankernas räntenetto — ca 2 333 kr/år per miljon i bolån',
    mkr: 12600, nyckel: 'bankskatt', källor: [3, 4, 5, 8] },
];

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
/* WordPress-bygget: pluginets stylesheet nollställer marginaler på
   p/h2/h3 med en olagrad #id-regel som vinner över Tailwinds lagrade
   marginal-utilities. Återställ de som används här med högre specificitet. */
#skattehojningar .space-y-3 > * + * { margin-top: 0.75rem; }
#skattehojningar :is(p, h2, h3).mb-1 { margin-bottom: 0.25rem; }
#skattehojningar :is(p, h2, h3).mb-2 { margin-bottom: 0.5rem; }
#skattehojningar :is(p, h2, h3).mb-3 { margin-bottom: 0.75rem; }
#skattehojningar :is(p, h2, h3).mb-4 { margin-bottom: 1rem; }
#skattehojningar :is(p, h2, h3).mb-5 { margin-bottom: 1.25rem; }
#skattehojningar :is(p, h2, h3).mb-6 { margin-bottom: 1.5rem; }
#skattehojningar :is(p, h2, h3).mt-1 { margin-top: 0.25rem; }
#skattehojningar :is(p, h2, h3).mt-2 { margin-top: 0.5rem; }
#skattehojningar :is(p, h2, h3).mt-3 { margin-top: 0.75rem; }
#skattehojningar :is(p, h2, h3).mt-5 { margin-top: 1.25rem; }
/* Toggle per förslag i detaljtabellen: röd = med i beräkningen, grå = av. */
#skattehojningar .skh-toggle {
  position: relative; display: inline-block;
  width: 38px; height: 22px; vertical-align: middle; flex: none;
}
#skattehojningar .skh-toggle input {
  position: absolute; inset: 0; width: 100%; height: 100%;
  margin: 0; opacity: 0; cursor: pointer;
}
#skattehojningar .skh-toggle .skh-spar {
  position: absolute; inset: 0; border-radius: 11px;
  background: #9CA3AF; transition: background 0.15s; pointer-events: none;
}
#skattehojningar .skh-toggle .skh-spar::after {
  content: ''; position: absolute; top: 2px; left: 2px;
  width: 18px; height: 18px; border-radius: 50%;
  background: #fff; box-shadow: 0 1px 2px rgba(0,0,0,0.3);
  transition: left 0.15s;
}
#skattehojningar .skh-toggle input:checked + .skh-spar { background: #DC2626; }
#skattehojningar .skh-toggle input:checked + .skh-spar::after { left: 18px; }
#skattehojningar .skh-toggle input:focus-visible + .skh-spar {
  outline: 2px solid #0072CE; outline-offset: 2px;
}
`;

/* ── HTML template ──────────────────────────────────────────────────── */

function reglageFält({ id, label, enhet, min, max, step, value, minText, maxText, hint, bredd = 'w-36' }) {
  return `
    <fieldset>
      <label for="skh-${id}" class="block text-base font-medium mb-1">${label}</label>
      <div class="flex items-baseline gap-1 mb-2">
        <input type="text" id="skh-${id}-edit" inputmode="numeric"
               class="${bredd} text-2xl font-bold bg-transparent border-b-2 border-dashed border-gray-400 focus:border-blue-600 outline-none cursor-text transition-colors text-right"
               style="color:#0072CE">
        <span class="text-lg font-medium text-gray-500">${enhet}</span>
      </div>
      <input type="range" id="skh-${id}" min="${min}" max="${max}" step="${step}" value="${value}"
             class="brand-slider w-full">
      <div class="flex justify-between text-xs text-gray-400 mt-1">
        <span>${minText}</span>
        <span>${maxText}</span>
      </div>
      ${hint ? `<p class="text-xs text-gray-400 mt-1">${hint}</p>` : ''}
    </fieldset>`;
}

function valutaFält(id, label, hint) {
  return `
    <fieldset>
      <label for="skh-${id}" class="block text-base font-medium mb-1">${label}</label>
      <div class="flex items-baseline gap-2">
        <input type="text" id="skh-${id}" inputmode="numeric" placeholder="0"
               class="w-36 rounded border border-gray-300 px-3 py-2 text-lg text-right bg-white">
        <span class="text-base text-gray-500">kr/år</span>
      </div>
      ${hint ? `<p class="text-xs text-gray-400 mt-1">${hint}</p>` : ''}
    </fieldset>`;
}

function template() {
  const flygVal = Object.entries(FLYGSKATT)
    .map(([k, v]) => `<option value="${k}"${k === 'europa' ? ' selected' : ''}>${v.label}</option>`)
    .join('');

  return `
<div class="py-4">

  <section id="skh-total" aria-live="polite" class="mb-8"></section>

  <section class="bg-gray-100 rounded-lg p-4 sm:p-6 mb-8">
    <h3 class="text-lg font-bold mb-5">Din situation</h3>
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-6">
      ${reglageFält({ id: 'lon', label: 'Månadslön före skatt:', enhet: 'kr/mån', min: 0, max: 150000, step: 1000, value: 40000, minText: '0', maxText: '150 000' })}
      ${reglageFält({ id: 'isk', label: 'Sparande på ISK och kapitalförsäkring:', enhet: 'kr', min: 0, max: 5000000, step: 25000, value: 100000, minText: '0', maxText: '5 mkr' })}
      ${reglageFält({ id: 'bolan', label: 'Bolån:', enhet: 'kr', min: 0, max: 10000000, step: 100000, value: 1000000, minText: '0', maxText: '10 mkr' })}
      ${reglageFält({ id: 'marknad', label: 'Marknadsvärde på småhus:', enhet: 'kr', min: 0, max: 20000000, step: 250000, value: 4000000, minText: '0', maxText: '20 mkr', hint: 'Vad huset skulle säljas för i dag. Ange 0 om du inte äger småhus. Taxeringsvärdet räknas som 75 % av marknadsvärdet.' })}
      ${reglageFält({ id: 'mil', label: 'Årlig körsträcka (bensin/diesel):', enhet: 'mil', min: 0, max: 5000, step: 100, value: 1200, minText: '0', maxText: '5 000', bredd: 'w-28' })}
      <fieldset>
        <label for="skh-flyg" class="block text-base font-medium mb-1">Flygresor per år:</label>
        <div class="flex items-baseline gap-1 mb-2">
          <input type="text" id="skh-flyg-edit" inputmode="numeric"
                 class="w-16 text-2xl font-bold bg-transparent border-b-2 border-dashed border-gray-400 focus:border-blue-600 outline-none cursor-text transition-colors text-right"
                 style="color:#0072CE">
          <span class="text-lg font-medium text-gray-500">enkelresor</span>
        </div>
        <input type="range" id="skh-flyg" min="0" max="20" step="1" value="2" class="brand-slider w-full">
        <div class="flex justify-between text-xs text-gray-400 mt-1"><span>0</span><span>20</span></div>
        <select id="skh-flygtyp" class="mt-2 rounded border border-gray-300 px-3 py-2 text-sm bg-white w-full">${flygVal}</select>
      </fieldset>
      ${valutaFält('rut', 'RUT-avdrag', 'T.ex. städning, flyttjänster. Max 75 000 kr/år.')}
      ${valutaFält('rot', 'ROT-avdrag', 'Renovering och ombyggnad. Max 50 000 kr/år, och högst 75 000 kr/år för RUT och ROT tillsammans.')}
    </div>
    <p class="text-xs text-gray-400 mt-5">Dra i reglagen eller klicka på siffrorna och fyll i exakt värde.</p>
  </section>

  <section id="skh-resultat" aria-live="polite" class="mb-4"></section>

</div>
`;
}

/* ── Rendering ──────────────────────────────────────────────────────── */

function partiChip(parti) {
  if (parti === 'ALLA') {
    return `<span class="inline-flex gap-1">${['S', 'V', 'MP'].map(partiChip).join('')}</span>`;
  }
  // V:s justerade inkomstskattepaket: "V LIGHT" rött på vitt (à la Coca-Cola
  // light) och ursprungsförslaget "V CLASSIC" i partiets vanliga färger.
  if (parti === 'V_LIGHT') {
    return `<span class="inline-block px-2 py-0.5 rounded text-xs font-bold whitespace-nowrap"
      style="background:#FFFFFF;color:#DC2626;border:1.5px solid #DC2626;font-style:italic">V LIGHT</span>`;
  }
  if (parti === 'V_CLASSIC') {
    return `<span class="inline-block px-2 py-0.5 rounded text-xs font-bold whitespace-nowrap"
      style="background:${PARTI.V.färg};color:${PARTI.V.text}">V CLASSIC</span>`;
  }
  const p = PARTI[parti];
  return `<span class="inline-block px-2 py-0.5 rounded text-xs font-bold whitespace-nowrap"
    style="background:${p.färg};color:${p.text}">${parti}</span>`;
}

function fotnoter(källor) {
  return källor.map(n => `<sup class="text-gray-400">${n}</sup>`).join('<sup class="text-gray-400">,</sup>');
}

/**
 * Färg för totalrutan: grön vid 0, gul upp till 5 000 kr/år, därefter
 * en ljus ton av Skattebetalarnas röda profilfärg som mättas linjärt till
 * full profilröd (#F9423A) vid 10 000 kr/år och uppåt.
 */
function riskFärg(kr) {
  if (kr <= 0) return { bg: '#2BA784', text: '#FFFFFF' };
  if (kr < 5000) return { bg: '#FACC15', text: '#111827' };
  const t = clamp((kr - 5000) / 5000, 0, 1);
  const lerp = (a, b) => Math.round(a + (b - a) * t);
  const [r, g, b] = [lerp(252, 249), lerp(170, 66), lerp(166, 58)]; // ljus profilröd → #F9423A
  const ljushet = 0.299 * r + 0.587 * g + 0.114 * b;
  return { bg: `rgb(${r},${g},${b})`, text: ljushet < 150 ? '#FFFFFF' : '#111827' };
}

function totalKort(summa) {
  const f = riskFärg(summa);
  const belopp = summa > 0 ? '+' + formatKr(summa) : '0 kr';
  const underrad = summa > 0
    ? `per år &middot; ${formatKr(summa / 12)} per månad`
    : 'Ingen beräknad höjning med dina uppgifter';
  return `
    <div class="rounded-xl p-5 sm:p-6 text-center" style="background:${f.bg};color:${f.text};transition:background-color 0.3s ease">
      <p class="text-3xl sm:text-4xl font-bold">${belopp}</p>
      <p class="text-sm mt-1" style="opacity:0.85">${underrad}</p>
      ${summa > 0 ? `<p class="text-xs mt-2" style="opacity:0.75">Om S, V och MP bildar regering och genomför sina förslag. Där förslagen överlappar räknas partiernas mest långtgående förslag.</p>` : ''}
    </div>`;
}

function visaResultat(totalEl, tabellEl, inp) {
  const r = beräkna(inp);

  const rader = FÖRSLAG.map((f) => {
    const på = !f.nyckel || inp.aktiva[f.nyckel];
    const avstängd = på ? '' : ';opacity:0.45;filter:grayscale(1)';
    // Färglisten målas som ett absolut positionerat element i cellen —
    // inte som border-left, eftersom tabellens border-collapse gör att
    // border och cellbakgrund inte linjerar. Samma mekanism för alla rader
    // garanterar att listerna hamnar på exakt samma x-position.
    const kantList = `<span aria-hidden="true" style="position:absolute;left:0;top:0;bottom:0;width:4px;background:${
      f.parti === 'ALLA' ? TREFÄRGAD : PARTI[f.parti].färg}"></span>`;
    const belopp = f.nyckel
      ? (r[f.nyckel] > 0 ? '+' + formatKr(r[f.nyckel]) : '0 kr')
      : '&ndash;';
    const toggle = f.nyckel ? `
      <label class="skh-toggle" title="${på ? 'Med i beräkningen — klicka för att ta bort' : 'Borttagen ur beräkningen — klicka för att räkna med'}">
        <input type="checkbox" data-skh-toggle="${f.nyckel}"${på ? ' checked' : ''}
               aria-label="Räkna med: ${f.namn}">
        <span class="skh-spar"></span>
      </label>` : '';
    return `
      <tr class="border-t border-gray-200">
        <td class="py-2.5 pr-2" style="position:relative;padding-left:16px${avstängd}">
          ${kantList}<span class="font-medium text-gray-800">${f.namn}</span>${fotnoter(f.källor)}
          <span class="block text-xs text-gray-500">${f.detalj}</span>
        </td>
        <td class="py-2.5 px-2 align-top" style="${avstängd.slice(1)}">${partiChip(f.chip || f.parti)}</td>
        <td class="py-2.5 px-2 text-right align-top tabular-nums text-gray-500 whitespace-nowrap" style="${avstängd.slice(1)}">${f.mkr != null ? formateraInmatning(f.mkr) : 'oklart'}</td>
        <td class="py-2.5 px-2 text-right align-top tabular-nums font-semibold whitespace-nowrap ${på && f.nyckel && r[f.nyckel] > 0 ? 'text-gray-900' : 'text-gray-400'}">${på ? belopp : `<s>${belopp}</s>`}</td>
        <td class="py-2.5 pl-2 text-right align-top">${toggle}</td>
      </tr>`;
  }).join('');

  // Samlad rödgrön regering: överlappande förslag (skatt på arbetsinkomster,
  // ISK och flyg) räknas en gång — det mest långtgående per område — och
  // partiernas exklusiva förslag adderas. Avtogglade förslag räknas inte med.
  const v = (k) => (inp.aktiva[k] ? r[k] : 0);
  const inkomstskatt = Math.max(
    v('mpVärnskatt'), v('sAvtrappning'),
    // V light och classic utesluter varandra — högst en är aktiv i taget.
    v('vBeredskapUtfasning'), v('vBeredskapUtfasningClassic'),
  );
  const iskSkatt = Math.max(v('mpIsk'), v('sIsk'), v('vIsk'));
  const flygskatt = Math.max(v('mpFlyg'), v('vFlyg'));
  const total = inkomstskatt + iskSkatt + flygskatt
    + v('mpDrivmedel') + v('vFastighet') + v('vRut') + v('vRot') + v('bankskatt');

  totalEl.innerHTML = `
    <h3 class="text-lg font-bold mb-4">Så mycket kan din skatt höjas per år</h3>
    <div class="mb-3">
      ${totalKort(total)}
    </div>
    <p class="text-xs text-gray-400">Beloppet avser de förslag som går att beräkna på individnivå, inklusive den gemensamma bankskatten. Därtill kommer förslag som inte går att räkna på (markerade &ndash; i tabellen nedanför). Justera uppgifterna nedan så uppdateras beräkningen direkt — du kan också ta bort enskilda förslag ur beräkningen med reglagen i tabellen.</p>`;

  tabellEl.innerHTML = `

    <div class="bg-white border border-gray-300 rounded-lg p-4 sm:p-6 shadow-sm overflow-x-auto">
      <h3 class="text-lg font-bold mb-4">Förslagen i detalj</h3>
      <table class="w-full text-sm" style="min-width:620px">
        <thead>
          <tr class="text-xs text-gray-500 uppercase tracking-wide">
            <th class="text-left pb-2 pl-3">Förslag</th>
            <th class="text-left pb-2 px-2">Parti</th>
            <th class="text-right pb-2 px-2">Höjning totalt (mkr)</th>
            <th class="text-right pb-2 px-2">Din kostnad per år</th>
            <th class="text-right pb-2 pl-2">Räkna med</th>
          </tr>
        </thead>
        <tbody>${rader}</tbody>
      </table>
      <p class="text-xs text-gray-400 mt-3">Siffror i mkr är partiernas egna beräkningar av de offentligfinansiella effekterna 2026. Fotnoterna hänvisar till källförteckningen nedanför. Med reglaget längst till höger kan du ta bort enskilda förslag ur beräkningen.</p>
    </div>`;
}

/* ── Init ───────────────────────────────────────────────────────────── */

function init() {
  const container = document.getElementById('skattehojningar');
  if (!container) return;

  if (!document.querySelector('link[href*="fonts.googleapis.com"][href*="Inter"]')) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700&display=swap';
    document.head.appendChild(link);
  }

  if (!document.getElementById('skh-slider-css')) {
    const style = document.createElement('style');
    style.id = 'skh-slider-css';
    style.textContent = SLIDER_CSS;
    document.head.appendChild(style);
  }

  container.innerHTML = template();

  const state = {
    lön: 40000, isk: 100000, bolån: 1000000, marknad: 4000000,
    mil: 1200, flyg: 2, flygTyp: 'europa', rut: 0, rot: 0,
    // Alla beräkningsbara förslag aktiva som default (utom rader märkta
    // standardAv, t.ex. "V classic"); kan togglas av och på i tabellen.
    aktiva: Object.fromEntries(FÖRSLAG.filter((f) => f.nyckel).map((f) => [f.nyckel, !f.standardAv])),
  };

  const totalEl = document.getElementById('skh-total');
  const tabellEl = document.getElementById('skh-resultat');

  // Tabellen renderas om vid varje uppdatering — delegera därför
  // toggle-händelserna till den beständiga behållaren.
  // Ömsesidigt uteslutande rader (V light/classic): slås en på stängs den andra av.
  const utesluter = Object.fromEntries(
    FÖRSLAG.filter((f) => f.utesluter).map((f) => [f.nyckel, f.utesluter]),
  );

  tabellEl.addEventListener('change', (e) => {
    const nyckel = e.target.dataset && e.target.dataset.skhToggle;
    if (!nyckel) return;
    state.aktiva[nyckel] = e.target.checked;
    if (e.target.checked && utesluter[nyckel]) state.aktiva[utesluter[nyckel]] = false;
    uppdatera();
  });

  function uppdatera() {
    visaResultat(totalEl, tabellEl, state);
  }

  /**
   * Koppla ett reglage + tillhörande textfält till state[nyckel],
   * med samma beteende som övriga snurror (dra för jämna steg,
   * klicka och fyll i för exakt värde).
   */
  function kopplaReglage(nyckel, id, tak) {
    const slider = document.getElementById(`skh-${id}`);
    const edit = document.getElementById(`skh-${id}-edit`);
    edit.value = formateraInmatning(state[nyckel]);

    slider.addEventListener('input', () => {
      state[nyckel] = Number(slider.value);
      edit.value = formateraInmatning(state[nyckel]);
      uppdatera();
    });

    function frånInmatning() {
      let val = tolkVärde(edit.value);
      if (isNaN(val) || val < 0) val = 0;
      if (val > tak) val = tak;
      state[nyckel] = val;
      slider.value = val;
      edit.value = formateraInmatning(val);
      uppdatera();
    }
    edit.addEventListener('change', frånInmatning);
    edit.addEventListener('blur', frånInmatning);

    let timer = null;
    edit.addEventListener('input', () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        let val = tolkVärde(edit.value);
        if (!isNaN(val) && val >= 0) {
          if (val > tak) val = tak;
          state[nyckel] = val;
          slider.value = val;
          uppdatera();
        }
      }, 400);
    });
    edit.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        clearTimeout(timer);
        frånInmatning();
        edit.blur();
      }
    });
  }

  kopplaReglage('lön', 'lon', 500000);
  kopplaReglage('isk', 'isk', 50000000);
  kopplaReglage('bolån', 'bolan', 50000000);
  kopplaReglage('marknad', 'marknad', 100000000);
  kopplaReglage('mil', 'mil', 20000);
  kopplaReglage('flyg', 'flyg', 100);

  document.getElementById('skh-flygtyp').addEventListener('change', (e) => {
    state.flygTyp = e.target.value;
    uppdatera();
  });

  ['rut', 'rot'].forEach((nyckel) => {
    const el = document.getElementById(`skh-${nyckel}`);
    el.addEventListener('input', () => {
      let val = tolkVärde(el.value);
      if (isNaN(val) || val < 0) val = 0;
      const övrigt = nyckel === 'rut' ? state.rot : state.rut;
      state[nyckel] = Math.min(val, RUTROT_TAK[nyckel], RUTROT_TAK_TOTAL - övrigt);
      uppdatera();
    });
    el.addEventListener('blur', () => {
      el.value = state[nyckel] ? formateraInmatning(state[nyckel]) : '';
    });
    el.addEventListener('focus', () => {
      el.value = String(state[nyckel] || '');
    });
  });

  uppdatera();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
