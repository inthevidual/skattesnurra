/**
 * Räkna ut skatt på ISK — WordPress plugin.
 * Shortcode: [isk]
 *
 * Två verktyg:
 *  1. Schablonskatt på investeringssparkonto (kapitalunderlag → schablonintäkt → 30 %).
 *  2. Lönar det sig att flytta oplacerade pengar från ISK till sparkonto?
 *
 * Schablonskatten är skattefri upp till ett fribelopp på kapitalunderlaget
 * (150 000 kr för 2025, 300 000 kr från 2026), per person och för ISK + KF
 * tillsammans.
 */

/* ── Data ───────────────────────────────────────────────────────────── */
//
// Per beskattningsår: statslåneräntan (SLR) den 30 november året före, samt
// fribeloppet på kapitalunderlaget.

const ÅR_CONFIG = {
  2025: { slr: 0.0196, fribelopp: 150000 }, // SLR 30 nov 2024
  2026: { slr: 0.0255, fribelopp: 300000 }, // SLR 30 nov 2025
};

const STANDARD_ÅR = 2026;
const SCHABLON_PÅSLAG = 0.01;   // statslåneräntan + 1 procentenhet
const SCHABLON_GOLV = 0.0125;   // lägsta schablonränta 1,25 %
const KAPITALSKATT = 0.30;      // 30 % på schablonintäkten

function schablonränta(år) {
  const cfg = ÅR_CONFIG[år] || ÅR_CONFIG[STANDARD_ÅR];
  return Math.max(SCHABLON_GOLV, cfg.slr + SCHABLON_PÅSLAG);
}

/* ── Helpers ────────────────────────────────────────────────────────── */

function formatKr(n) {
  return Math.round(n).toLocaleString('sv-SE').replace(/ /g, ' ') + ' kr';
}

function formatProcent(n, dec = 2) {
  return n.toFixed(dec).replace('.', ',');
}

function formateraInmatning(n) {
  return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

function tolkTal(s) {
  if (s == null) return 0;
  const n = parseFloat(String(s).replace(/\s/g, '').replace(',', '.'));
  return Number.isNaN(n) ? 0 : n;
}

/* ── Calculation ────────────────────────────────────────────────────── */

function beräknaSchablonskatt(år, q1, q2, q3, q4, insättningar, överföringar) {
  const cfg = ÅR_CONFIG[år] || ÅR_CONFIG[STANDARD_ÅR];
  const summa = q1 + q2 + q3 + q4 + insättningar + överföringar;
  const kapitalunderlag = summa / 4;
  const beskattatUnderlag = Math.max(0, kapitalunderlag - cfg.fribelopp);
  const ränta = schablonränta(år);
  const schablonintäkt = beskattatUnderlag * ränta;
  const skatt = schablonintäkt * KAPITALSKATT;
  return {
    summa,
    kapitalunderlag,
    fribelopp: cfg.fribelopp,
    beskattatUnderlag,
    schablonränta: ränta,
    schablonintäkt,
    skatt,
    effektivSkattesats: ränta * KAPITALSKATT,
  };
}

// Antal dagar pengarna behöver ligga på sparkontot för att flytten ska löna
// sig. En insättning till ISK syns till en fjärdedel i kapitalunderlaget,
// därav schablonskattesatsen / 4.
function beräknaBrytdagar(år, sparkontoränta, iskRänta) {
  const effektiv = schablonränta(år) * KAPITALSKATT;
  const diff = sparkontoränta - iskRänta;
  if (diff <= 0) return Infinity;
  return (effektiv / 4) / (diff / 360);
}

/* ── Rendering ──────────────────────────────────────────────────────── */

const FÄRG_BLÅ = '#0072CE';
const FÄRG_GRÖN = '#2BA784';

function template() {
  const årsval = Object.keys(ÅR_CONFIG)
    .sort((a, b) => a - b)
    .map(år => `<option value="${år}"${Number(år) === STANDARD_ÅR ? ' selected' : ''}>${år}</option>`)
    .join('');

  const valutaFält = (id, label, hint) => `
      <fieldset>
        <label for="${id}" class="block text-base font-medium mb-1">${label}</label>
        <div class="flex items-baseline gap-2">
          <input type="text" id="${id}" inputmode="numeric" placeholder="0"
                 class="w-36 rounded border border-gray-300 px-3 py-2 text-lg text-right">
          <span class="text-base text-gray-500">kr</span>
        </div>
        ${hint ? `<p class="text-xs text-gray-400 mt-1">${hint}</p>` : ''}
      </fieldset>`;

  return `
<div class="py-4">

  <section class="mb-8">
    <h2 class="text-2xl sm:text-3xl font-bold mb-4">Räkna ut din ISK-skatt</h2>
    <p class="mb-2">Ett investeringssparkonto (ISK) schablonbeskattas – du betalar en fast procentsats på kontots värde i stället för på vinsten. Från 2026 är sparandet skattefritt upp till 300&nbsp;000&nbsp;kr per person (150&nbsp;000&nbsp;kr för 2025). Fyll i värdena nedan så räknar vi ut din skatt.</p>
  </section>

  <section class="bg-gray-100 rounded-lg p-4 sm:p-6 mb-6">
    <div class="flex items-center gap-2 mb-5">
      <label for="isk-ar" class="text-base font-medium">Beskattningsår:</label>
      <select id="isk-ar" class="rounded border border-gray-300 px-3 py-2 text-base bg-white">${årsval}</select>
    </div>

    <p class="text-sm font-medium text-gray-700 mb-2">Kontots värde vid ingången av varje kvartal:</p>
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-5">
      ${valutaFält('isk-q1', '1 januari')}
      ${valutaFält('isk-q2', '1 april')}
      ${valutaFält('isk-q3', '1 juli')}
      ${valutaFält('isk-q4', '1 oktober')}
    </div>
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
      ${valutaFält('isk-ins', 'Insättningar under året', 'Totala insättningar (ej utdelningar).')}
      ${valutaFält('isk-over', 'Överförda värdepapper', 'Värdet av värdepapper du fört in på kontot.')}
    </div>
  </section>

  <section id="isk-resultat" aria-live="polite" class="mb-10"></section>

  <section class="mb-6">
    <h2 class="text-xl sm:text-2xl font-bold mb-3">Lönar det sig att flytta oplacerade pengar till sparkonto?</h2>
    <p class="mb-2 text-base">Oplacerade pengar på ditt ISK ger oftast ingen ränta, men räknas ändå in i skatteunderlaget. Här ser du hur länge pengarna behöver ligga på ett sparkonto för att flytten ska löna sig.</p>
  </section>

  <section class="bg-gray-100 rounded-lg p-4 sm:p-6 mb-6">
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <fieldset>
        <label for="isk-spar" class="block text-base font-medium mb-1">Ränta på sparkontot</label>
        <div class="flex items-baseline gap-2">
          <input type="text" id="isk-spar" inputmode="decimal" placeholder="1,70"
                 class="w-24 rounded border border-gray-300 px-3 py-2 text-lg text-right" value="1,70">
          <span class="text-base text-gray-500">%</span>
        </div>
      </fieldset>
      <fieldset>
        <label for="isk-iskranta" class="block text-base font-medium mb-1">Ränta på ISK-saldot</label>
        <div class="flex items-baseline gap-2">
          <input type="text" id="isk-iskranta" inputmode="decimal" placeholder="0"
                 class="w-24 rounded border border-gray-300 px-3 py-2 text-lg text-right" value="0">
          <span class="text-base text-gray-500">%</span>
        </div>
        <p class="text-xs text-gray-400 mt-1">Vanligtvis 0 % på oplacerat saldo.</p>
      </fieldset>
    </div>
  </section>

  <section id="isk-flytt-resultat" aria-live="polite" class="mb-8"></section>

  <section class="bg-gray-50 border border-gray-200 rounded-lg p-4 sm:p-6 mb-8">
    <h3 class="text-lg font-semibold mb-3">Om beräkningen</h3>
    <div class="text-sm text-gray-700 leading-relaxed space-y-3">
      <p><strong>Kapitalunderlag.</strong> En fjärdedel av summan av kontots värde vid ingången av varje kvartal, plus årets insättningar och värdet av överförda värdepapper. Utdelningar räknas inte som insättningar.</p>
      <p><strong>Schablonintäkt och skatt.</strong> Kapitalunderlaget över fribeloppet multipliceras med statslåneräntan den 30 november året före + 1 procentenhet (lägst 1,25 %). Den schablonintäkten beskattas med 30 % och är förtryckt i din deklaration – du behöver inte räkna ut den själv.</p>
      <p><strong>Fribelopp.</strong> Sparande upp till 300&nbsp;000&nbsp;kr (2026) respektive 150&nbsp;000&nbsp;kr (2025) är skattefritt. Beloppet gäller per person och för dina ISK och kapitalförsäkringar (KF) tillsammans – inte per konto.</p>
      <p><strong>Flytta oplacerade pengar.</strong> Eftersom varje insättning till ISK höjer skatteunderlaget lönar det sig att flytta pengar fram och tillbaka bara om de ligger kvar tillräckligt länge. Tar du ut pengarna och låter dem ligga över ett kvartalsskifte är flytten alltid fördelaktig. Beräkningen är en tumregel och ersätter inte rådgivning.</p>
    </div>
  </section>

</div>
`;
}

function visaSchablonskatt(container, r, år) {
  let html = '';

  html += `<div class="text-center mb-6">
    <p class="text-base text-gray-500 mb-1">Schablonskatt på ditt ISK för ${år}</p>
    <p class="text-4xl sm:text-5xl font-bold" style="color:${FÄRG_BLÅ}">${formatKr(r.skatt)}</p>
    <p class="text-base text-gray-400 mt-2">${r.beskattatUnderlag > 0
      ? `effektiv skatt ${formatProcent(r.effektivSkattesats * 100, 3)} % av kapitalunderlaget`
      : 'Ditt sparande ligger under fribeloppet – ingen skatt'}</p>
  </div>`;

  html += `<div class="bg-white border border-gray-300 rounded-lg p-4 sm:p-6 shadow-sm">`;
  html += `<h3 class="text-lg font-bold mb-4">Så beräknas skatten</h3>`;
  html += `<table class="w-full text-sm sm:text-base"><tbody>`;

  const rows = [
    { label: 'Summa kvartalsvärden + insättningar + överföringar', value: formatKr(r.summa) },
    { label: 'Kapitalunderlag (summan delat på 4)', value: formatKr(r.kapitalunderlag), strong: true },
    { label: `Fribelopp (${år})`, value: '− ' + formatKr(r.fribelopp), neg: true },
    { label: 'Beskattat underlag', value: formatKr(r.beskattatUnderlag) },
    { label: `Schablonränta (SLR + 1 pe, lägst 1,25 %)`, value: formatProcent(r.schablonränta * 100) + ' %' },
    { label: 'Schablonintäkt (förtryckt i deklarationen)', value: formatKr(r.schablonintäkt) },
  ];
  rows.forEach((row, i) => {
    const bg = i % 2 === 0 ? '' : 'bg-gray-100';
    const color = row.neg ? 'color:#F9423A' : '';
    html += `<tr class="border-t border-gray-200 ${bg}">
      <td class="py-2.5 ${row.strong ? 'font-semibold' : 'font-medium'} text-gray-800">${row.label}</td>
      <td class="py-2.5 text-right ${row.strong ? 'font-bold' : 'font-semibold'} tabular-nums text-gray-900" style="${color}">${row.value}</td>
    </tr>`;
  });
  html += `<tr class="border-t-2 border-gray-900">
    <td class="py-3 font-bold text-gray-900">Skatt (30 % av schablonintäkten)</td>
    <td class="py-3 text-right font-bold tabular-nums" style="color:${FÄRG_BLÅ}">${formatKr(r.skatt)}</td>
  </tr>`;
  html += `</tbody></table></div>`;

  container.innerHTML = html;
}

function visaFlytt(container, dagar, lönar, schablonProcent) {
  let html = '';
  if (!lönar) {
    html += `<div class="bg-gray-100 rounded-lg p-4 sm:p-6 text-center">
      <p class="text-lg font-medium text-gray-700">Sparkontot ger inte högre ränta än ditt ISK-saldo – det lönar sig inte att flytta pengarna.</p>
    </div>`;
  } else {
    const d = Math.round(dagar);
    html += `<div class="bg-white border border-gray-300 rounded-lg p-4 sm:p-6 shadow-sm text-center">
      <p class="text-base text-gray-500 mb-1">Flytten lönar sig om pengarna ligger kvar i minst</p>
      <p class="text-4xl sm:text-5xl font-bold" style="color:${FÄRG_GRÖN}">${formateraInmatning(d)} dagar</p>
      <p class="text-base text-gray-400 mt-3">Tumregel vid en schablonskatt på ${formatProcent(schablonProcent, 3)} % och de räntor du angett. Ligger pengarna kvar över ett kvartalsskifte lönar sig flytten alltid.</p>
    </div>`;
  }
  container.innerHTML = html;
}

/* ── Init ───────────────────────────────────────────────────────────── */

function init() {
  const container = document.getElementById('isk');
  if (!container) return;

  if (!document.querySelector('link[href*="fonts.googleapis.com"][href*="Inter"]')) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700&display=swap';
    document.head.appendChild(link);
  }

  container.innerHTML = template();

  const els = {
    år: document.getElementById('isk-ar'),
    q1: document.getElementById('isk-q1'),
    q2: document.getElementById('isk-q2'),
    q3: document.getElementById('isk-q3'),
    q4: document.getElementById('isk-q4'),
    ins: document.getElementById('isk-ins'),
    over: document.getElementById('isk-over'),
    spar: document.getElementById('isk-spar'),
    iskränta: document.getElementById('isk-iskranta'),
    resultat: document.getElementById('isk-resultat'),
    flytt: document.getElementById('isk-flytt-resultat'),
  };

  function uppdatera() {
    const år = Number(els.år.value);
    const r = beräknaSchablonskatt(
      år,
      tolkTal(els.q1.value), tolkTal(els.q2.value),
      tolkTal(els.q3.value), tolkTal(els.q4.value),
      tolkTal(els.ins.value), tolkTal(els.over.value),
    );
    visaSchablonskatt(els.resultat, r, år);

    const sparR = tolkTal(els.spar.value) / 100;
    const iskR = tolkTal(els.iskränta.value) / 100;
    const dagar = beräknaBrytdagar(år, sparR, iskR);
    visaFlytt(els.flytt, dagar, Number.isFinite(dagar), schablonränta(år) * KAPITALSKATT * 100);
  }

  const valutaFält = [els.q1, els.q2, els.q3, els.q4, els.ins, els.over];
  els.år.addEventListener('change', uppdatera);
  [...valutaFält, els.spar, els.iskränta].forEach(el => el.addEventListener('input', uppdatera));
  valutaFält.forEach((el) => {
    el.addEventListener('blur', () => { const v = tolkTal(el.value); el.value = v ? formateraInmatning(v) : ''; });
    el.addEventListener('focus', () => { el.value = String(tolkTal(el.value) || ''); });
  });

  uppdatera();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
