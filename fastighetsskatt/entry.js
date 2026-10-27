/**
 * Fastighetsskatt — WordPress plugin.
 * Shortcode: [fastighetsskatt]
 */

/* ── Helpers ────────────────────────────────────────────────────────── */

function formatKr(n) {
  return Math.round(n).toLocaleString('sv-SE');
}

function formateraInmatning(n) {
  return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '\u2009');
}

function tolkVärde(s) {
  return Number(s.replace(/\s/g, ''));
}

/* ── Slider CSS ────────────────────────────────────────────────────── */

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

function template(imgBase) {
  return `
<div class="py-4">

  <section class="mb-8">
    <h2 class="text-2xl sm:text-3xl font-bold mb-4">Räkna ut din fastighetsskatt</h2>
    <p class="mb-2">Fastighetsskatten ersattes 2008 av en kommunal fastighetsavgift. Här kan du se vad det skulle kosta om skatten återinförs.</p>
  </section>

  <section class="bg-gray-100 rounded-lg p-4 sm:p-6 mb-8">
    <div class="flex flex-col sm:flex-row gap-6 items-start">
      <div class="sm:w-1/2 w-full">
        <picture>
          <source type="image/avif"
                  srcset="${imgBase}bird-house-400.avif 400w, ${imgBase}bird-house-800.avif 800w, ${imgBase}bird-house-1200.avif 1200w"
                  sizes="(min-width: 640px) 50vw, 100vw">
          <source type="image/webp"
                  srcset="${imgBase}bird-house-400.webp 400w, ${imgBase}bird-house-800.webp 800w, ${imgBase}bird-house-1200.webp 1200w"
                  sizes="(min-width: 640px) 50vw, 100vw">
          <img src="${imgBase}bird-house-800.jpg"
               srcset="${imgBase}bird-house-400.jpg 400w, ${imgBase}bird-house-800.jpg 800w, ${imgBase}bird-house-1200.jpg 1200w"
               sizes="(min-width: 640px) 50vw, 100vw"
               alt="fågelholk" class="rounded-lg w-full" loading="lazy" decoding="async">
        </picture>
      </div>
      <div class="sm:w-1/2 w-full">
        <fieldset>
          <label class="block text-base font-medium mb-1">Bostadens marknadsvärde:</label>
          <div class="flex items-baseline gap-1 mb-2">
            <input type="text" id="fastighet-edit" inputmode="numeric"
                   class="w-40 text-2xl font-bold bg-transparent border-b-2 border-dashed border-gray-400 focus:border-blue-600 outline-none cursor-text transition-colors text-right"
                   style="color:#0072CE">
            <span class="text-lg font-medium text-gray-500">kr</span>
          </div>
          <input type="range" id="fastighet-slider" min="500000" max="20000000" step="100000" value="3000000"
                 class="brand-slider w-full">
          <div class="flex justify-between text-xs text-gray-400 mt-1">
            <span>500 000</span>
            <span>20 000 000</span>
          </div>
          <p class="text-xs text-gray-400 mt-1">Dra för jämna hundratusental, klicka och fyll i för exakt belopp</p>
        </fieldset>
      </div>
    </div>
  </section>

  <section id="fastighet-resultat" class="bg-gray-100 rounded-lg p-4 sm:p-6 mb-8">
  </section>

  <section id="fastighet-info" class="mb-8">
    <h3 class="text-lg font-semibold mb-2">Om beräkningen</h3>
    <p class="text-sm text-gray-700 leading-relaxed">
      <strong>Takbelopp:</strong> Fastighetsavgiften för en villa uppgår 2026 till 10 387 kronor
      och till 1 777 kronor för en bostadsrätt, men är också begränsad till att aldrig överstiga
      0,75 procent av taxeringsvärdet för villor och 0,3 procent för bostadsrätter.
      Räknesnurran tar inte hänsyn till de särregler som finns för dagens fastighetsavgift,
      exempelvis för nybyggda småhus och pensionärer med låg inkomst.
    </p>
  </section>

</div>
`;
}

/* ── Calculation & rendering ────────────────────────────────────────── */

function beräkna(marketValue) {
  const tax = marketValue * 0.75; // taxeringsvärde
  const newTax = tax * 0.01;      // 1% fastighetsskatt

  // Villa: 0.75% capped at 10 387 kr
  const currentVilla = Math.min(tax * 0.0075, 10387);
  // Apartment: 0.3% capped at 1 777 kr
  const currentApt = Math.min(tax * 0.003, 1777);

  return { newTax, currentVilla, currentApt };
}

function renderBar(label, current, future) {
  const pctCurrent = Math.min(100, Math.round((current / future) * 100));
  const increase = future - current;

  return `
    <div class="bg-white rounded-lg p-4 sm:p-5">
      <h3 class="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">${label}</h3>
      <p class="text-2xl font-bold mb-4" style="color:#F9423A">+${formatKr(increase)} kr</p>

      <p class="text-sm font-medium text-gray-700 mb-1">Nuvarande avgift: <strong>${formatKr(current)} kr</strong></p>
      <div class="flex h-8 rounded-lg overflow-hidden bg-gray-200 mb-4">
        <div style="width:${pctCurrent}%;background:#0072CE"
             class="h-full flex items-center justify-center text-white text-sm font-semibold transition-all">
          ${formatKr(current)}
        </div>
      </div>

      <p class="text-sm font-medium text-gray-700 mb-1">Framtida skatt: <strong>${formatKr(future)} kr</strong></p>
      <div class="flex h-8 rounded-lg overflow-hidden bg-gray-200">
        <div style="width:90%;background:#F9423A"
             class="h-full flex items-center justify-center text-white text-sm font-semibold transition-all">
          ${formatKr(future)}
        </div>
      </div>
    </div>`;
}

function visaResultat(container, marketValue) {
  const { newTax, currentVilla, currentApt } = beräkna(marketValue);

  container.innerHTML = `
    <h2 class="text-xl font-bold mb-4">
      Jämfört med dagens takbelopp* för fastighetsavgiften motsvarar det en
    </h2>
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
      ${renderBar('Höjd skatt för en villa', currentVilla, newTax)}
      ${renderBar('Höjd skatt för en bostadsrätt', currentApt, newTax)}
    </div>
  `;
}

/* ── Init ───────────────────────────────────────────────────────────── */

function init() {
  const container = document.getElementById('fastighetsskatt');
  if (!container) return;

  // Load fonts
  if (!document.querySelector('link[href*="fonts.googleapis.com"][href*="Inter"]')) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700&display=swap';
    document.head.appendChild(link);
  }

  // Inject slider CSS
  if (!document.getElementById('fastighet-slider-css')) {
    const style = document.createElement('style');
    style.id = 'fastighet-slider-css';
    style.textContent = SLIDER_CSS;
    document.head.appendChild(style);
  }

  // Resolve image base URL from script src (works in both WP plugin and local preview)
  const scriptEl = document.querySelector('script[src*="fastighetsskatt"]');
  const imgBase = scriptEl
    ? scriptEl.src.replace(/[^/]*$/, '') + 'img/'
    : 'img/';

  container.innerHTML = template(imgBase);

  const slider = document.getElementById('fastighet-slider');
  const edit = document.getElementById('fastighet-edit');
  const resultat = document.getElementById('fastighet-resultat');

  let exaktVärde = null;

  function uppdatera() {
    const val = exaktVärde !== null ? exaktVärde : Number(slider.value);
    if (val <= 0) return;
    visaResultat(resultat, val);
  }

  function synkaFrånReglage() {
    exaktVärde = null;
    edit.value = formateraInmatning(Number(slider.value));
    uppdatera();
  }

  function synkaFrånInmatning() {
    let val = tolkVärde(edit.value);
    if (isNaN(val) || val < 0) val = 0;
    if (val > 50000000) val = 50000000;
    exaktVärde = val;
    slider.value = Math.round(val / 100000) * 100000;
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
        if (val > 50000000) val = 50000000;
        exaktVärde = val;
        slider.value = Math.round(val / 100000) * 100000;
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

  // Initial render with default value
  edit.value = formateraInmatning(Number(slider.value));
  uppdatera();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
