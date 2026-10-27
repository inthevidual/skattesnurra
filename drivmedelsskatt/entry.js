/**
 * Drivmedelsskatt — WordPress plugin.
 * Shortcode: [drivmedelsskatt]
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
@keyframes drivmedel-w1 {
  0%   { d: path("M0,0 L180,0 L180,5 C168,10 152,13 130,9 C108,5 88,12 65,10 C42,8 22,14 0,11 Z"); }
  33%  { d: path("M0,0 L180,0 L180,10 C165,6 145,3 125,8 C100,13 78,5 55,9 C35,12 15,7 0,6 Z"); }
  66%  { d: path("M0,0 L180,0 L180,7 C160,13 140,9 115,12 C92,7 70,4 50,8 C30,11 12,5 0,9 Z"); }
  100% { d: path("M0,0 L180,0 L180,5 C168,10 152,13 130,9 C108,5 88,12 65,10 C42,8 22,14 0,11 Z"); }
}
@keyframes drivmedel-w2 {
  0%   { d: path("M0,0 L180,0 L180,8 C162,4 138,11 118,7 C95,3 75,10 52,8 C32,6 14,11 0,7 Z"); }
  50%  { d: path("M0,0 L180,0 L180,4 C158,9 135,6 112,10 C90,8 68,3 48,7 C28,10 10,5 0,9 Z"); }
  100% { d: path("M0,0 L180,0 L180,8 C162,4 138,11 118,7 C95,3 75,10 52,8 C32,6 14,11 0,7 Z"); }
}
@keyframes drivmedel-w3 {
  0%   { d: path("M0,0 L180,0 L180,6 C155,11 132,4 108,8 C82,12 60,6 38,9 C18,7 6,10 0,5 Z"); }
  40%  { d: path("M0,0 L180,0 L180,9 C158,5 128,10 102,6 C78,4 58,11 35,7 C16,9 5,4 0,8 Z"); }
  70%  { d: path("M0,0 L180,0 L180,4 C150,8 125,12 100,7 C72,3 55,9 32,11 C15,6 8,8 0,10 Z"); }
  100% { d: path("M0,0 L180,0 L180,6 C155,11 132,4 108,8 C82,12 60,6 38,9 C18,7 6,10 0,5 Z"); }
}
.drivmedel-w1 { animation: drivmedel-w1 5s ease-in-out infinite; }
.drivmedel-w2 { animation: drivmedel-w2 3.7s ease-in-out infinite; }
.drivmedel-w3 { animation: drivmedel-w3 7s ease-in-out infinite; }
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

const TEMPLATE = `
<div class="py-4">

  <section class="mb-8">
    <h2 class="text-2xl sm:text-3xl font-bold mb-4">Räkna ut din drivmedelsskatt</h2>
    <p class="mb-2">Se hur mycket av ditt bränslepris som är skatt, baserat på din körsträcka och förbrukning.</p>
  </section>

  <section class="bg-gray-100 rounded-lg p-4 sm:p-6 mb-8">
    <div class="flex flex-col sm:flex-row gap-6 items-start">
      <div class="sm:w-1/2 w-full">
        <img src="https://skattebetalarna.se/wp-content/uploads/2021/10/Tankning-mostphotos.jpeg"
             alt="hand som håller i bensinpump" class="rounded-lg w-full mb-4">

        <div class="bg-white rounded-lg p-4" id="drivmedel-info-box">
          <button type="button" id="drivmedel-info-toggle"
                  class="flex items-center gap-2 text-sm font-semibold w-full text-left"
                  style="color:#0072CE">
            <svg class="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"/>
            </svg>
            Så här hög är din bensin- och dieselskatt
          </button>
          <div id="drivmedel-info-content" class="text-sm text-gray-700 leading-relaxed mt-3">
            <p>
              Mellan 2014 och 2021 höjdes skatten på bensin med nästan 2 kronor per liter.
              De senaste åren har skatten på bensin och diesel dock sänkts kraftigt, senast sommaren 2025.
            </p>
            <p class="mt-2">
              Halvårsskiftet 2018 infördes även reduktionsplikt på drivmedel som innebär att utsläppen
              av växthusgaser ska minska genom ökad inblandning av biodrivmedel. Eftersom biodrivmedel
              är dyrare än det fossila och dessutom mindre energität så driver inblandningen upp priset
              per liter diesel och bensin, och höjer förbrukningen per mil.
            </p>
            <p class="mt-2">
              Reduktionsplikten sänktes kraftigt, främst på diesel, den 1 januari 2024.
              I juli 2025 höjdes dock reduktionsplikten igen, samtidigt som skatten på bensin
              och diesel sänktes för att motverka prishöjningar vid pump.
            </p>
          </div>
        </div>
      </div>

      <div class="sm:w-1/2 w-full">
        <fieldset class="mb-6">
          <label class="block text-base font-medium mb-1">Årlig körsträcka:</label>
          <div class="flex items-baseline gap-1 mb-2">
            <input type="text" id="drivmedel-mileage-edit" inputmode="numeric"
                   class="w-28 text-2xl font-bold bg-transparent border-b-2 border-dashed border-gray-400 focus:border-blue-600 outline-none cursor-text transition-colors text-right"
                   style="color:#0072CE">
            <span class="text-lg font-medium text-gray-500">mil</span>
          </div>
          <input type="range" id="drivmedel-mileage" min="0" max="5000" step="100" value="1500"
                 class="brand-slider w-full">
          <div class="flex justify-between text-xs text-gray-400 mt-1">
            <span>0</span>
            <span>5 000</span>
          </div>
          <p class="text-xs text-gray-400 mt-1">Dra för jämna hundratal, klicka och fyll i för exakt värde</p>
        </fieldset>

        <fieldset class="mb-6">
          <label class="block text-base font-medium mb-1">Förbrukning:</label>
          <div class="flex items-baseline gap-1 mb-2">
            <input type="text" id="drivmedel-consumption-edit" inputmode="decimal"
                   class="w-20 text-2xl font-bold bg-transparent border-b-2 border-dashed border-gray-400 focus:border-blue-600 outline-none cursor-text transition-colors text-right"
                   style="color:#0072CE">
            <span class="text-lg font-medium text-gray-500">l/mil</span>
          </div>
          <input type="range" id="drivmedel-consumption" min="30" max="200" step="1" value="82"
                 class="brand-slider w-full">
          <div class="flex justify-between text-xs text-gray-400 mt-1">
            <span>0,3</span>
            <span>2,0</span>
          </div>
          <p class="text-xs text-gray-400 mt-1">Snittet i Sverige är 0,82 l/mil</p>
        </fieldset>

        <div id="drivmedel-resultat" class="mt-6">
        </div>
      </div>
    </div>
  </section>

</div>
`;

/* ── Calculation & rendering ────────────────────────────────────────── */

// 2026 values
const PETROL_TAX = 7.95;   // kr/l incl VAT
const DIESEL_TAX = 7.37;   // kr/l incl VAT
const PETROL_PRICE = 15.81; // kr/l
const DIESEL_PRICE = 17.02; // kr/l

function beräkna(mileage, consumption) {
  const liters = mileage * consumption;

  const petrolTaxTotal = liters * PETROL_TAX;
  const dieselTaxTotal = liters * DIESEL_TAX;
  const petrolPriceTotal = liters * PETROL_PRICE;
  const dieselPriceTotal = liters * DIESEL_PRICE;
  const petrolFuelCost = petrolPriceTotal - petrolTaxTotal;
  const dieselFuelCost = dieselPriceTotal - dieselTaxTotal;
  const petrolTaxPct = (petrolTaxTotal / petrolPriceTotal) * 100;
  const dieselTaxPct = (dieselTaxTotal / dieselPriceTotal) * 100;

  return {
    petrolTaxTotal, dieselTaxTotal,
    petrolFuelCost, dieselFuelCost,
    petrolTaxPct, dieselTaxPct,
  };
}

function renderFuelTank(fuelLabel, taxTotal, fuelCost, taxPct) {
  const fuelPct = 100 - taxPct;
  const totalCost = taxTotal + fuelCost;

  // The petroleum fills the entire tank as background.
  // The red tax layer sits on top with a wavy bottom edge — only one boundary, no seam.
  return `
    <div class="bg-white rounded-2xl p-5 sm:p-6 flex flex-col items-center">
      <h3 class="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">${fuelLabel}</h3>

      <!-- Vertical tank -->
      <div style="width:140px;height:280px;border-radius:16px;overflow:hidden;position:relative;background:linear-gradient(to top,#111 0%,#1e1e1e 40%,#2a2a2a 100%);box-shadow:inset 0 2px 8px rgba(0,0,0,0.12)">

        <!-- Petroleum sheen — always visible behind everything -->
        <div style="position:absolute;inset:0;pointer-events:none">
          <div style="position:absolute;top:20%;left:10px;right:45px;height:35%;border-radius:8px;background:linear-gradient(180deg,rgba(255,255,255,0.05) 0%,transparent 100%)"></div>
        </div>

        <!-- Fuel label — anchored to bottom of tank -->
        <div style="position:absolute;bottom:0;left:0;right:0;padding:14px 8px;display:flex;flex-direction:column;align-items:center;text-align:center;z-index:1">
          <span style="color:rgba(255,255,255,0.45)" class="text-xs font-semibold uppercase tracking-wider">${fuelLabel} ${Math.round(fuelPct)}%</span>
          <span style="color:rgba(255,255,255,0.75)" class="text-lg font-bold mt-1">${formatKr(fuelCost)} kr</span>
        </div>

        <!-- Tax (red) — covers top portion with wavy bottom edge, shortened to compensate for wave overhang -->
        <div style="position:absolute;top:0;left:0;right:0;height:calc(${taxPct.toFixed(1)}% - 10px);min-height:0;transition:height 0.6s ease;z-index:2">
          <!-- Solid red fill — stops where waves begin -->
          <div style="position:absolute;top:0;left:0;right:0;bottom:16px;background:linear-gradient(to bottom,#E8342F 0%,#F9423A 100%)"></div>

          <!-- Wavy drip — three irregular layers hanging into the petroleum -->
          <svg viewBox="0 0 180 16" preserveAspectRatio="none"
               style="position:absolute;bottom:-2px;left:0;width:100%;height:18px;display:block">
            <path class="drivmedel-w1" fill="#F9423A"
                  d="M0,0 L180,0 L180,5 C168,10 152,13 130,9 C108,5 88,12 65,10 C42,8 22,14 0,11 Z"/>
            <path class="drivmedel-w2" fill="#E8342F" opacity="0.5"
                  d="M0,0 L180,0 L180,8 C162,4 138,11 118,7 C95,3 75,10 52,8 C32,6 14,11 0,7 Z"/>
            <path class="drivmedel-w3" fill="#D42D27" opacity="0.3"
                  d="M0,0 L180,0 L180,6 C155,11 132,4 108,8 C82,12 60,6 38,9 C18,7 6,10 0,5 Z"/>
          </svg>

          <!-- Tax label -->
          <div style="position:absolute;top:0;left:0;right:0;bottom:14px;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:8px;text-align:center;z-index:3">
            <span style="color:rgba(255,255,255,0.7)" class="text-xs font-semibold uppercase tracking-wider">Skatt ${Math.round(taxPct)}%</span>
            <span class="text-lg font-bold text-white mt-1">${formatKr(taxTotal)} kr</span>
          </div>
        </div>

      </div>

      <p class="text-xs text-gray-400 mt-4">Årskostnad: ${formatKr(totalCost)} kr</p>
    </div>`;
}

function visaResultat(container, mileage, consumption) {
  if (mileage <= 0) {
    container.innerHTML = '';
    return;
  }
  const r = beräkna(mileage, consumption);

  container.innerHTML = `
    <h3 class="text-lg font-bold mb-4">Din totala drivmedelsskatt per år</h3>
    <div class="grid grid-cols-2 gap-4">
      ${renderFuelTank('Bensin', r.petrolTaxTotal, r.petrolFuelCost, r.petrolTaxPct)}
      ${renderFuelTank('Diesel', r.dieselTaxTotal, r.dieselFuelCost, r.dieselTaxPct)}
    </div>
    <p class="text-xs text-gray-500 mt-4 text-center">Bensinpris ${PETROL_PRICE} kr/l · Dieselpris ${DIESEL_PRICE} kr/l (2026). Skatt inkl. moms.</p>
  `;
}

/* ── Init ───────────────────────────────────────────────────────────── */

function init() {
  const container = document.getElementById('drivmedelsskatt');
  if (!container) return;

  // Load fonts
  if (!document.querySelector('link[href*="fonts.googleapis.com"][href*="Inter"]')) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700&display=swap';
    document.head.appendChild(link);
  }

  // Inject slider CSS
  if (!document.getElementById('drivmedel-slider-css')) {
    const style = document.createElement('style');
    style.id = 'bensin-slider-css';
    style.textContent = SLIDER_CSS;
    document.head.appendChild(style);
  }

  container.innerHTML = TEMPLATE;

  const mileageSlider = document.getElementById('drivmedel-mileage');
  const mileageEdit = document.getElementById('drivmedel-mileage-edit');
  const consumptionSlider = document.getElementById('drivmedel-consumption');
  const consumptionEdit = document.getElementById('drivmedel-consumption-edit');
  const resultat = document.getElementById('drivmedel-resultat');

  let exaktKörsträcka = null;
  let exaktFörbrukning = null;

  function getMileage() {
    return exaktKörsträcka !== null ? exaktKörsträcka : Number(mileageSlider.value);
  }

  function getConsumption() {
    return exaktFörbrukning !== null ? exaktFörbrukning : Number(consumptionSlider.value) / 100;
  }

  function uppdatera() {
    visaResultat(resultat, getMileage(), getConsumption());
  }

  // ── Mileage slider ↔ edit ──────────────────────────────────────

  function synkaMileageFrånReglage() {
    exaktKörsträcka = null;
    mileageEdit.value = formateraInmatning(Number(mileageSlider.value));
    uppdatera();
  }

  function synkaMileageFrånInmatning() {
    let val = tolkVärde(mileageEdit.value);
    if (isNaN(val) || val < 0) val = 0;
    if (val > 10000) val = 10000;
    exaktKörsträcka = val;
    mileageSlider.value = Math.round(val / 100) * 100;
    mileageEdit.value = formateraInmatning(val);
    uppdatera();
  }

  mileageSlider.addEventListener('input', synkaMileageFrånReglage);
  mileageEdit.addEventListener('change', synkaMileageFrånInmatning);
  mileageEdit.addEventListener('blur', synkaMileageFrånInmatning);

  let mileageTimer = null;
  mileageEdit.addEventListener('input', () => {
    clearTimeout(mileageTimer);
    mileageTimer = setTimeout(() => {
      let val = tolkVärde(mileageEdit.value);
      if (!isNaN(val) && val >= 0) {
        if (val > 10000) val = 10000;
        exaktKörsträcka = val;
        mileageSlider.value = Math.round(val / 100) * 100;
        uppdatera();
      }
    }, 400);
  });

  mileageEdit.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      clearTimeout(mileageTimer);
      synkaMileageFrånInmatning();
      mileageEdit.blur();
    }
  });

  // ── Consumption slider ↔ edit ──────────────────────────────────
  // Slider uses integer values 30–200 representing 0.30–2.00 l/mil

  function formateraFörbrukning(v) {
    return v.toFixed(2).replace('.', ',');
  }

  function tolkFörbrukning(s) {
    return Number(s.replace(/\s/g, '').replace(/,/g, '.'));
  }

  function synkaConsumptionFrånReglage() {
    exaktFörbrukning = null;
    consumptionEdit.value = formateraFörbrukning(Number(consumptionSlider.value) / 100);
    uppdatera();
  }

  function synkaConsumptionFrånInmatning() {
    let val = tolkFörbrukning(consumptionEdit.value);
    if (isNaN(val) || val < 0.1) val = 0.3;
    if (val > 3) val = 3;
    exaktFörbrukning = val;
    consumptionSlider.value = Math.round(val * 100);
    consumptionEdit.value = formateraFörbrukning(val);
    uppdatera();
  }

  consumptionSlider.addEventListener('input', synkaConsumptionFrånReglage);
  consumptionEdit.addEventListener('change', synkaConsumptionFrånInmatning);
  consumptionEdit.addEventListener('blur', synkaConsumptionFrånInmatning);

  let consumptionTimer = null;
  consumptionEdit.addEventListener('input', () => {
    clearTimeout(consumptionTimer);
    consumptionTimer = setTimeout(() => {
      let val = tolkFörbrukning(consumptionEdit.value);
      if (!isNaN(val) && val >= 0.1) {
        if (val > 3) val = 3;
        exaktFörbrukning = val;
        consumptionSlider.value = Math.round(val * 100);
        uppdatera();
      }
    }, 400);
  });

  consumptionEdit.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      clearTimeout(consumptionTimer);
      synkaConsumptionFrånInmatning();
      consumptionEdit.blur();
    }
  });

  // Info box toggle
  const toggle = document.getElementById('drivmedel-info-toggle');
  const content = document.getElementById('drivmedel-info-content');
  let infoOpen = true;
  toggle.addEventListener('click', () => {
    infoOpen = !infoOpen;
    content.classList.toggle('hidden', !infoOpen);
  });

  // Initial render with defaults
  mileageEdit.value = formateraInmatning(Number(mileageSlider.value));
  consumptionEdit.value = formateraFörbrukning(Number(consumptionSlider.value) / 100);
  uppdatera();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
