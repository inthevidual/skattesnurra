/**
 * Räkna ut 3:12-utdelning — WordPress plugin.
 * Shortcode: [utdelning312]
 *
 * Beräknar lågbeskattat utdelningsutrymme (gränsbelopp) i fåmansaktiebolag
 * enligt de nya, sammanslagna 3:12-reglerna som gäller från inkomstår 2026.
 * Logiken följer Wints 3:12-kalkylator.
 */

/* ── Data ───────────────────────────────────────────────────────────── */
//
// Per inkomstår: inkomstbasbelopp (IBB) från föregående år samt föregående
// års statslåneränta (SLR). När SLR ännu inte är fastställd räknas endast
// med 9 % på omkostnadsbeloppet.

const ÅR_CONFIG = {
  2026: { ibb: 80600, slr: 0.0255 },
  2027: { ibb: 83400, slr: 0 },
};

const STANDARD_ÅR = 2026;
const SKATT = 0.20;                 // skatt inom gränsbeloppet
const OMKOSTNAD_FRIBELOPP = 100000; // ränta räknas på del över detta
const RÄNTESATS_PÅSLAG = 0.09;      // 9 % + SLR

/* ── Helpers ────────────────────────────────────────────────────────── */

function formatKr(n) {
  return Math.round(n).toLocaleString('sv-SE').replace(/ /g, ' ') + ' kr';
}

function formateraInmatning(n) {
  return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

function tolkTal(s) {
  if (s == null) return 0;
  const n = parseFloat(String(s).replace(/\s/g, '').replace(',', '.'));
  return Number.isNaN(n) ? 0 : n;
}

function clamp(n, lo, hi) {
  return Math.max(lo, Math.min(hi, n));
}

/* ── Calculation (faithful to the Wint 3:12 calculator) ─────────────── */

function beräkna(inår, ägarandelPct, totalaLöner, omkostnad, andraBolagPct) {
  const cfg = ÅR_CONFIG[inår] || ÅR_CONFIG[STANDARD_ÅR];
  const andel = clamp(ägarandelPct, 0, 100) / 100;
  const andraAndel = clamp(andraBolagPct, 0, 100) / 100;

  // Grundbelopp: din andel av 4 inkomstbasbelopp.
  const grundbelopp = cfg.ibb * 4 * andel;

  // Reducering om sammanlagd ägarandel i flera bolag överstiger 100 %.
  let reducering = 0;
  const totalAndel = andel + andraAndel;
  if (andel > 0 && totalAndel > 1) {
    reducering = grundbelopp / totalAndel - grundbelopp; // negativt
  }

  // Lönebaserat utrymme: hälften av löneunderlaget efter avdrag om 8 IBB.
  const löneAvdrag = cfg.ibb * 8;
  const lönebaserat = Math.max(0, (totalaLöner * andel - löneAvdrag) / 2);

  // Ränta på omkostnadsbelopp över fribeloppet.
  let ränta = 0;
  if (omkostnad > OMKOSTNAD_FRIBELOPP) {
    ränta = (omkostnad - OMKOSTNAD_FRIBELOPP) * (RÄNTESATS_PÅSLAG + cfg.slr);
  }

  const utdelningsutrymme = grundbelopp + reducering + lönebaserat + ränta;
  const efterSkatt = utdelningsutrymme * (1 - SKATT);
  const löneuttagskrav = lönebaserat / 50;

  return {
    ibb: cfg.ibb,
    räntesats: RÄNTESATS_PÅSLAG + cfg.slr,
    grundbelopp,
    reducering,
    grundbeloppNetto: grundbelopp + reducering,
    lönebaserat,
    ränta,
    utdelningsutrymme,
    efterSkatt,
    löneuttagskrav,
  };
}

/* ── Rendering ──────────────────────────────────────────────────────── */

const FÄRG_GRUND = '#0072CE';  // blue
const FÄRG_LÖN = '#2BA784';    // green
const FÄRG_RÄNTA = '#F5A623';  // amber

function template() {
  const årsval = Object.keys(ÅR_CONFIG)
    .sort((a, b) => a - b)
    .map(år => `<option value="${år}"${Number(år) === STANDARD_ÅR ? ' selected' : ''}>${år}</option>`)
    .join('');

  return `
<div class="py-4">

  <section class="mb-8">
    <h2 class="text-2xl sm:text-3xl font-bold mb-4">Räkna ut din 3:12-utdelning</h2>
    <p class="mb-2">3:12-reglerna avgör hur stor utdelning du kan ta ut till låg skatt (20 %) från ditt fåmansaktiebolag. Från inkomstår 2026 slås huvudregeln och förenklingsregeln ihop till en gemensam regel. Fyll i uppgifterna nedan så räknar vi ut ditt utdelningsutrymme (gränsbelopp).</p>
  </section>

  <section class="bg-gray-100 rounded-lg p-4 sm:p-6 mb-8">
    <div class="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6 mb-5">
      <label for="u312-ar" class="text-base font-medium">Beräkna utdelningsutrymme för inkomstår:</label>
      <select id="u312-ar" class="rounded border border-gray-300 px-3 py-2 text-base bg-white">${årsval}</select>
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
      <fieldset>
        <label for="u312-andel" class="block text-base font-medium mb-1">Hur stor andel av bolaget äger du?</label>
        <div class="flex items-baseline gap-2">
          <input type="text" id="u312-andel" inputmode="numeric"
                 class="w-24 rounded border border-gray-300 px-3 py-2 text-lg text-right" value="100">
          <span class="text-base text-gray-500">%</span>
        </div>
      </fieldset>

      <fieldset>
        <label for="u312-loner" class="block text-base font-medium mb-1">Bolagets totala kontanta löner <span id="u312-loner-ar" class="text-gray-500"></span></label>
        <div class="flex items-baseline gap-2">
          <input type="text" id="u312-loner" inputmode="numeric" placeholder="0"
                 class="w-40 rounded border border-gray-300 px-3 py-2 text-lg text-right">
          <span class="text-base text-gray-500">kr</span>
        </div>
      </fieldset>

      <fieldset>
        <label for="u312-omkostnad" class="block text-base font-medium mb-1">Aktiernas omkostnadsbelopp <span class="text-gray-500">(anskaffningskostnad)</span></label>
        <div class="flex items-baseline gap-2">
          <input type="text" id="u312-omkostnad" inputmode="numeric" placeholder="0"
                 class="w-40 rounded border border-gray-300 px-3 py-2 text-lg text-right">
          <span class="text-base text-gray-500">kr</span>
        </div>
      </fieldset>

      <fieldset>
        <label for="u312-andra" class="block text-base font-medium mb-1">Ägarandel i andra fåmansbolag</label>
        <div class="flex items-baseline gap-2">
          <input type="text" id="u312-andra" inputmode="numeric" placeholder="0"
                 class="w-24 rounded border border-gray-300 px-3 py-2 text-lg text-right">
          <span class="text-base text-gray-500">%</span>
        </div>
        <p class="text-xs text-gray-400 mt-1">Påverkar bara grundbeloppet om din sammanlagda ägarandel överstiger 100 %.</p>
      </fieldset>
    </div>
  </section>

  <section id="u312-resultat" aria-live="polite" class="mb-8"></section>

  <section class="bg-gray-50 border border-gray-200 rounded-lg p-4 sm:p-6 mb-8">
    <h3 class="text-lg font-semibold mb-3">Om beräkningen</h3>
    <div class="text-sm text-gray-700 leading-relaxed space-y-3">
      <p><strong>Grundbelopp.</strong> Du får tillgodoräkna dig din andel av 4 inkomstbasbelopp (IBB) från föregående år. Varje delägare får högst ett grundbelopp totalt – äger du flera fåmansbolag fördelas beloppet, vilket visas som en reducering.</p>
      <p><strong>Lönebaserat utrymme.</strong> Hälften av din andel av bolagets kontanta löner, efter ett avdrag på 8 inkomstbasbelopp. För att utnyttja hela det lönebaserade utrymmet finns ett krav på egen lön.</p>
      <p><strong>Ränta på omkostnadsbelopp.</strong> Statslåneräntan + 9 % på den del av aktiernas anskaffningskostnad som överstiger 100 000 kr. Är föregående års statslåneränta ännu inte fastställd räknas endast med 9 %.</p>
      <p><strong>Utdelning inom gränsbeloppet</strong> beskattas med 20 %. Sparat utdelningsutrymme från tidigare år får läggas till gränsbeloppet och är inte med i beräkningen ovan. Kalkylen är förenklad och ersätter inte rådgivning.</p>
    </div>
  </section>

</div>
`;
}

function visaResultat(container, inår, r) {
  const total = r.utdelningsutrymme;
  const seg = (v) => (total > 0 ? Math.max(0, v / total * 100) : 0);
  const gPct = seg(r.grundbeloppNetto);
  const lPct = seg(r.lönebaserat);
  const rPct = seg(r.ränta);

  let html = '';

  // ── Headline ──────────────────────────────────────────────────────
  html += `<div class="text-center mb-6">
    <p class="text-base text-gray-500 mb-1">Utdelning till 20 % skatt – kvar efter skatt</p>
    <p class="text-4xl sm:text-5xl font-bold" style="color:${FÄRG_LÖN}">${formatKr(r.efterSkatt)}</p>
    <p class="text-base text-gray-400 mt-2">Utdelningsutrymme (gränsbelopp): ${formatKr(r.utdelningsutrymme)} · skatt 20 %</p>
  </div>`;

  // ── Stacked bar ───────────────────────────────────────────────────
  if (total > 0) {
    const seg_html = (pct, color, label) => pct >= 7
      ? `<div style="width:${pct}%;background:${color}" class="h-full flex items-center justify-center text-white text-xs font-semibold transition-all">${label}</div>`
      : `<div style="width:${pct}%;background:${color}" class="h-full transition-all"></div>`;
    html += `<div class="mb-2">
      <div class="flex h-10 rounded-lg overflow-hidden">
        ${seg_html(gPct, FÄRG_GRUND, Math.round(gPct) + ' %')}
        ${seg_html(lPct, FÄRG_LÖN, Math.round(lPct) + ' %')}
        ${seg_html(rPct, FÄRG_RÄNTA, Math.round(rPct) + ' %')}
      </div>
      <div class="flex flex-wrap gap-x-5 gap-y-1 mt-3 mb-6 text-sm">
        <span class="flex items-center gap-2"><span class="inline-block w-3 h-3 rounded-sm" style="background:${FÄRG_GRUND}"></span>Grundbelopp</span>
        <span class="flex items-center gap-2"><span class="inline-block w-3 h-3 rounded-sm" style="background:${FÄRG_LÖN}"></span>Lönebaserat utrymme</span>
        <span class="flex items-center gap-2"><span class="inline-block w-3 h-3 rounded-sm" style="background:${FÄRG_RÄNTA}"></span>Ränta på omkostnadsbelopp</span>
      </div>
    </div>`;
  }

  // ── Breakdown table ───────────────────────────────────────────────
  html += `<div class="bg-white border border-gray-300 rounded-lg p-4 sm:p-6 shadow-sm">`;
  html += `<h3 class="text-lg font-bold mb-4">Så beräknas ditt gränsbelopp</h3>`;
  html += `<table class="w-full text-sm sm:text-base"><tbody>`;

  const rows = [
    { label: 'Grundbelopp', value: r.grundbelopp },
  ];
  if (Math.round(r.reducering) !== 0) {
    rows.push({ label: 'Reducering grundbelopp', value: r.reducering, neg: true });
  }
  rows.push({ label: 'Lönebaserat utrymme', value: r.lönebaserat });
  rows.push({ label: 'Ränta på omkostnadsbelopp', value: r.ränta });

  rows.forEach((row, i) => {
    const bg = i % 2 === 0 ? '' : 'bg-gray-100';
    const color = row.neg ? 'color:#F9423A' : '';
    html += `<tr class="border-t border-gray-200 ${bg}">
      <td class="py-2.5 font-medium text-gray-800">${row.label}</td>
      <td class="py-2.5 text-right font-semibold tabular-nums text-gray-900" style="${color}">${formatKr(row.value)}</td>
    </tr>`;
  });

  html += `<tr class="border-t-2 border-gray-900">
    <td class="py-3 font-bold text-gray-900">Utdelningsutrymme (gränsbelopp)</td>
    <td class="py-3 text-right font-bold tabular-nums" style="color:${FÄRG_GRUND}">${formatKr(r.utdelningsutrymme)}</td>
  </tr>`;
  html += `</tbody></table>`;

  if (r.lönebaserat > 0) {
    html += `<p class="text-sm text-gray-600 mt-4">För att utnyttja hela det lönebaserade utrymmet behöver din egen lön i bolaget ${inår - 1} uppgå till minst <strong>${formatKr(r.löneuttagskrav)}</strong>.</p>`;
  }
  html += `</div>`;

  container.innerHTML = html;
}

/* ── Init ───────────────────────────────────────────────────────────── */

function init() {
  const container = document.getElementById('utdelning312');
  if (!container) return;

  // Load fonts
  if (!document.querySelector('link[href*="fonts.googleapis.com"][href*="Inter"]')) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700&display=swap';
    document.head.appendChild(link);
  }

  container.innerHTML = template();

  const els = {
    år: document.getElementById('u312-ar'),
    andel: document.getElementById('u312-andel'),
    löner: document.getElementById('u312-loner'),
    omkostnad: document.getElementById('u312-omkostnad'),
    andra: document.getElementById('u312-andra'),
    lönerÅr: document.getElementById('u312-loner-ar'),
    resultat: document.getElementById('u312-resultat'),
  };

  function uppdatera() {
    const inår = Number(els.år.value);
    els.lönerÅr.textContent = '[' + (inår - 1) + ']';
    const r = beräkna(
      inår,
      tolkTal(els.andel.value),
      tolkTal(els.löner.value),
      tolkTal(els.omkostnad.value),
      tolkTal(els.andra.value),
    );
    visaResultat(els.resultat, inår, r);
  }

  // Format currency inputs with thousand separators on blur.
  function formateraFält(el) {
    const v = tolkTal(el.value);
    el.value = v ? formateraInmatning(v) : '';
  }

  els.år.addEventListener('change', uppdatera);
  [els.andel, els.löner, els.omkostnad, els.andra].forEach((el) => {
    el.addEventListener('input', uppdatera);
  });
  [els.löner, els.omkostnad].forEach((el) => {
    el.addEventListener('blur', () => { formateraFält(el); });
    el.addEventListener('focus', () => { el.value = String(tolkTal(el.value) || ''); });
  });

  uppdatera();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
