import { beräknaHistoriskSkatt } from './history-engine.js?v=1.0';

const FIRST_YEAR = 1971;
const LAST_YEAR = 2025;
const NUM_YEARS = LAST_YEAR - FIRST_YEAR + 1;

// Stacked layers bottom→top (taxes at bottom, kvar at top)
const LAYERS = [
  { key: 'arbetsgivar',   label: 'Arbetsgivaravgifter',  color: '#5C5D6E' },
  { key: 'egenavgifter',  label: 'Allm. egenavgifter',  color: '#7B5EA7' },
  { key: 'statlig',       label: 'Statlig skatt',       color: '#C2625E' },
  { key: 'kommunalskatt', label: 'Kommunalskatt netto', color: '#F9423A' },
  { key: 'moms',          label: 'Moms',                color: '#F5A623' },
  { key: 'kvar',          label: 'Kvar efter skatt',    color: '#2BA784' },
];

const REFORMS = [
  { year: 1991, label: '1991 — Århundradets skattereform' },
  { year: 1995, label: '1995 — Värnskatten' },
  { year: 2007, label: '2007 — Jobbskatteavdraget' },
  { year: 2020, label: '2020 — Värnskatten avskaffas' },
];

// Chart geometry
const W = 700, H = 400;
const PAD = { top: 20, right: 20, bottom: 40, left: 45 };
const CW = W - PAD.left - PAD.right;
const CH = H - PAD.top - PAD.bottom;

function beräknaAllaÅr(månadslön) {
  const årsinkomst = månadslön * 12;
  const data = [];

  for (let year = FIRST_YEAR; year <= LAST_YEAR; year++) {
    const r = beräknaHistoriskSkatt(årsinkomst, year);
    const total = r.totalEmployerCost;
    if (total <= 0) {
      data.push({ year, kvar: 100, moms: 0, kommunalskatt: 0, statlig: 0, egenavgifter: 0, arbetsgivar: 0, skattesats: 0 });
      continue;
    }

    const arbetsgivar = (r.payrollTax / total) * 100;
    const egenavgifter = (r.employeeFees / total) * 100;
    const statlig = (r.centralTax / total) * 100;
    // kommunalskatt netto = kommunalskatt - jobbskatteavdrag, clamp to 0
    let kommunalskattNetto = ((r.municipalTax - r.eitc) / total) * 100;
    let extraKvar = 0;
    if (kommunalskattNetto < 0) {
      extraKvar = -kommunalskattNetto;
      kommunalskattNetto = 0;
    }
    const moms = (r.vat / total) * 100;
    // kvar = remainder so everything sums to exactly 100
    const kvar = 100 - arbetsgivar - egenavgifter - statlig - kommunalskattNetto - moms + extraKvar;

    data.push({
      year,
      kvar: Math.max(0, kvar),
      moms,
      kommunalskatt: kommunalskattNetto,
      statlig,
      egenavgifter,
      arbetsgivar,
      skattesats: r.averageTaxRate * 100,
    });
  }
  return data;
}

function xPos(year) {
  return PAD.left + ((year - FIRST_YEAR) / (NUM_YEARS - 1)) * CW;
}

function yPos(pct) {
  return PAD.top + (1 - pct / 100) * CH;
}

/** Build SVG path for a stacked area between y0[] and y1[] */
function areaPath(data, y0Arr, y1Arr) {
  let d = '';
  // top line left→right
  for (let i = 0; i < data.length; i++) {
    const x = xPos(data[i].year);
    const y = yPos(y1Arr[i]);
    d += (i === 0 ? 'M' : 'L') + `${x.toFixed(1)},${y.toFixed(1)}`;
  }
  // bottom line right→left
  for (let i = data.length - 1; i >= 0; i--) {
    const x = xPos(data[i].year);
    const y = yPos(y0Arr[i]);
    d += `L${x.toFixed(1)},${y.toFixed(1)}`;
  }
  d += 'Z';
  return d;
}

function buildChart(data) {
  // Compute cumulative stacks
  const stacks = []; // stacks[layerIndex][yearIndex] = { y0, y1 }
  const cumulative = new Array(data.length).fill(0);

  for (const layer of LAYERS) {
    const stack = [];
    for (let i = 0; i < data.length; i++) {
      const y0 = cumulative[i];
      const y1 = y0 + data[i][layer.key];
      stack.push({ y0, y1 });
      cumulative[i] = y1;
    }
    stacks.push(stack);
  }

  let svg = `<svg viewBox="0 0 ${W} ${H}" class="w-full" style="max-height:450px" xmlns="http://www.w3.org/2000/svg">`;

  // Area layers
  for (let li = 0; li < LAYERS.length; li++) {
    const y0Arr = stacks[li].map(s => s.y0);
    const y1Arr = stacks[li].map(s => s.y1);
    svg += `<path d="${areaPath(data, y0Arr, y1Arr)}" fill="${LAYERS[li].color}" opacity="0.85"/>`;
  }

  // Reform annotation lines
  for (const reform of REFORMS) {
    const x = xPos(reform.year);
    svg += `<line x1="${x.toFixed(1)}" y1="${PAD.top}" x2="${x.toFixed(1)}" y2="${PAD.top + CH}" stroke="white" stroke-width="1" stroke-dasharray="4,3" opacity="0.6"/>`;
    // Label — rotated
    svg += `<text x="${(x + 4).toFixed(1)}" y="${(PAD.top + 12).toFixed(1)}" fill="white" font-size="9" font-weight="600" opacity="0.8">${reform.year}</text>`;
  }

  // Y-axis labels + grid
  for (const pct of [0, 25, 50, 75, 100]) {
    const y = yPos(pct);
    svg += `<line x1="${PAD.left}" y1="${y.toFixed(1)}" x2="${PAD.left + CW}" y2="${y.toFixed(1)}" stroke="#e5e7eb" stroke-width="0.5" opacity="0.4"/>`;
    svg += `<text x="${(PAD.left - 6).toFixed(1)}" y="${(y + 4).toFixed(1)}" text-anchor="end" fill="#6b7280" font-size="11">${pct}%</text>`;
  }

  // X-axis labels (decade marks)
  for (let year = 1980; year <= 2020; year += 10) {
    const x = xPos(year);
    svg += `<text x="${x.toFixed(1)}" y="${(PAD.top + CH + 20).toFixed(1)}" text-anchor="middle" fill="#6b7280" font-size="11">${year}</text>`;
  }
  // Also 1971
  svg += `<text x="${xPos(1971).toFixed(1)}" y="${(PAD.top + CH + 20).toFixed(1)}" text-anchor="middle" fill="#6b7280" font-size="11">1971</text>`;

  // Invisible overlay for mouse interaction
  svg += `<rect id="utveckling-overlay" x="${PAD.left}" y="${PAD.top}" width="${CW}" height="${CH}" fill="transparent" style="cursor:crosshair"/>`;

  // Cursor line (hidden by default)
  svg += `<line id="utveckling-cursor" x1="0" y1="${PAD.top}" x2="0" y2="${PAD.top + CH}" stroke="#111" stroke-width="1" opacity="0" pointer-events="none"/>`;

  svg += '</svg>';
  return svg;
}

function buildLegend() {
  // Reverse so top layer (kvar) is listed first
  const items = [...LAYERS].reverse().map(l =>
    `<div class="flex items-center gap-1.5">
      <span class="inline-block w-3 h-3 rounded-sm flex-shrink-0" style="background:${l.color}"></span>
      <span class="text-sm">${l.label}</span>
    </div>`
  ).join('');
  return `<div class="flex flex-wrap gap-x-4 gap-y-1 mt-3">${items}</div>`;
}

function buildReformLegend() {
  const items = REFORMS.map(r =>
    `<span class="text-xs text-gray-500">${r.label}</span>`
  ).join('<span class="text-gray-300">|</span>');
  return `<div class="flex flex-wrap gap-2 mt-2 justify-center">${items}</div>`;
}

function buildSummary(data, månadslön) {
  const first = data[0];
  const last = data[data.length - 1];
  const diff = last.skattesats - first.skattesats;
  const riktning = diff > 0 ? 'ökat' : 'minskat';
  const formatted = n => n.toFixed(1).replace('.', ',');

  return `<p class="text-sm text-gray-700 mt-4">
    Vid en månadslön på <strong>${månadslön.toLocaleString('sv-SE')} kr</strong> (i dagens penningvärde)
    har den effektiva skattesatsen ${riktning} från <strong>${formatted(first.skattesats)}%</strong> (${FIRST_YEAR})
    till <strong>${formatted(last.skattesats)}%</strong> (${LAST_YEAR}) — en förändring på
    <strong>${diff > 0 ? '+' : ''}${formatted(diff)}</strong> procentenheter.
  </p>`;
}

function setupInteractivity(container, data) {
  const overlay = container.querySelector('#utveckling-overlay');
  const cursor = container.querySelector('#utveckling-cursor');
  const tooltip = container.querySelector('#utveckling-tooltip');
  if (!overlay || !cursor || !tooltip) return;

  function positionFromEvent(e) {
    const svg = overlay.closest('svg');
    const rect = svg.getBoundingClientRect();
    const svgX = ((e.clientX - rect.left) / rect.width) * W;
    return svgX;
  }

  function yearFromSvgX(svgX) {
    const ratio = (svgX - PAD.left) / CW;
    const yearIdx = Math.round(ratio * (NUM_YEARS - 1));
    return Math.max(0, Math.min(NUM_YEARS - 1, yearIdx));
  }

  function showTooltip(e) {
    const svgX = positionFromEvent(e);
    const idx = yearFromSvgX(svgX);
    const d = data[idx];
    const cx = xPos(d.year);

    cursor.setAttribute('x1', cx.toFixed(1));
    cursor.setAttribute('x2', cx.toFixed(1));
    cursor.setAttribute('opacity', '0.5');

    const f = n => n.toFixed(1).replace('.', ',') + '%';
    // List top-to-bottom: kvar first, then taxes
    const rows = [...LAYERS].reverse().map(l =>
      `<div style="color:${l.color}">${l.label}: ${f(d[l.key])}</div>`
    ).join('');
    tooltip.innerHTML = `
      <div class="font-bold mb-1">${d.year}</div>
      ${rows}
      <div class="mt-1 border-t border-gray-200 pt-1 font-semibold">Skattesats: ${f(d.skattesats)}</div>
    `;
    tooltip.classList.remove('hidden');

    // Position tooltip near cursor
    const svg = overlay.closest('svg');
    const rect = svg.getBoundingClientRect();
    const xPx = (cx / W) * rect.width;
    const flipSide = xPx > rect.width * 0.65;
    tooltip.style.top = '10px';
    if (flipSide) {
      tooltip.style.left = '';
      tooltip.style.right = (rect.width - xPx + 12) + 'px';
    } else {
      tooltip.style.right = '';
      tooltip.style.left = (xPx + 12) + 'px';
    }
  }

  function hideTooltip() {
    cursor.setAttribute('opacity', '0');
    tooltip.classList.add('hidden');
  }

  overlay.addEventListener('mousemove', showTooltip);
  overlay.addEventListener('mouseleave', hideTooltip);
  overlay.addEventListener('touchmove', (e) => {
    e.preventDefault();
    if (e.touches.length > 0) {
      showTooltip(e.touches[0]);
    }
  }, { passive: false });
  overlay.addEventListener('touchend', hideTooltip);
}

/** Format number with thin space thousands separator for inputs */
function formateraInmatning(n) {
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '\u2009');
}

function tolkLön(str) {
  return Number(str.replace(/\s/g, ''));
}

export function initieraUtveckling() {
  const incomeSlider = document.querySelector('#utveckling-lon');
  const incomeEdit = document.querySelector('#utveckling-lon-edit');
  const chartContainer = document.querySelector('#utveckling-chart');
  const annotationsContainer = document.querySelector('#utveckling-annotations');
  if (!incomeSlider || !incomeEdit || !chartContainer) return;

  let exaktLön = null;

  function uppdatera() {
    const månadslön = exaktLön !== null ? exaktLön : Number(incomeSlider.value);
    if (månadslön <= 0) {
      chartContainer.innerHTML = '<p class="text-gray-500">Ange en lön för att se diagrammet.</p>';
      if (annotationsContainer) annotationsContainer.innerHTML = '';
      return;
    }

    const data = beräknaAllaÅr(månadslön);

    chartContainer.innerHTML = `
      <div class="relative">
        ${buildChart(data)}
        <div id="utveckling-tooltip" class="hidden absolute bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-sm pointer-events-none z-10 whitespace-nowrap" style="min-width:160px"></div>
      </div>
      ${buildLegend()}
      ${buildReformLegend()}
    `;

    setupInteractivity(chartContainer, data);

    if (annotationsContainer) {
      annotationsContainer.innerHTML = buildSummary(data, månadslön);
    }
  }

  function synkaFrånReglage() {
    exaktLön = null;
    incomeEdit.value = formateraInmatning(Number(incomeSlider.value));
    uppdatera();
  }

  function synkaFrånInmatning() {
    let val = tolkLön(incomeEdit.value);
    if (isNaN(val) || val < 0) val = 0;
    if (val > 100000) val = 100000;
    exaktLön = val;
    incomeSlider.value = Math.round(val / 1000) * 1000;
    incomeEdit.value = formateraInmatning(val);
    uppdatera();
  }

  incomeSlider.addEventListener('input', synkaFrånReglage);
  incomeEdit.addEventListener('change', synkaFrånInmatning);
  incomeEdit.addEventListener('blur', synkaFrånInmatning);

  let inmatningsTimer = null;
  incomeEdit.addEventListener('input', () => {
    clearTimeout(inmatningsTimer);
    inmatningsTimer = setTimeout(() => {
      let val = tolkLön(incomeEdit.value);
      if (!isNaN(val) && val >= 0) {
        if (val > 100000) val = 100000;
        exaktLön = val;
        incomeSlider.value = Math.round(val / 1000) * 1000;
        uppdatera();
      }
    }, 400);
  });

  incomeEdit.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      clearTimeout(inmatningsTimer);
      synkaFrånInmatning();
      incomeEdit.blur();
    }
  });

  // Initial render
  incomeEdit.value = formateraInmatning(Number(incomeSlider.value));
  uppdatera();
}
