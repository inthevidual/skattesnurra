import { MUNICIPALITIES } from './constants.js?v=0.31';
import { formatRounded } from './utils.js?v=0.31';

/**
 * Populate the hidden <select> and wire up the searchable dropdown.
 * @param {HTMLSelectElement} selectElement
 */
export function populateMunicipalityDropdown(selectElement) {
  const wrapper = document.querySelector('#komm-wrapper');
  const input = document.querySelector('#komm-search');
  const list = document.querySelector('#komm-list');

  // Populate hidden select
  for (const municipality of MUNICIPALITIES) {
    const option = document.createElement('option');
    option.value = municipality.rate;
    option.textContent = municipality.name;
    selectElement.appendChild(option);
  }

  // Set initial input text to first municipality
  input.value = selectElement.options[0].text;

  function buildList(filter) {
    list.innerHTML = '';
    const lower = filter.toLowerCase();
    for (const m of MUNICIPALITIES) {
      if (lower && !m.name.toLowerCase().includes(lower)) continue;
      const li = document.createElement('li');
      li.textContent = m.name;
      li.dataset.rate = m.rate;
      li.className = 'px-3 py-2 cursor-pointer hover:bg-blue-100';
      list.appendChild(li);
    }
  }

  function open() {
    buildList(input.value === selectElement.options[selectElement.selectedIndex].text ? '' : input.value);
    list.classList.remove('hidden');
  }

  function close() {
    list.classList.add('hidden');
  }

  function selectMunicipality(name, rate) {
    input.value = name;
    // Update hidden select
    for (let i = 0; i < selectElement.options.length; i++) {
      if (selectElement.options[i].value === String(rate)) {
        selectElement.selectedIndex = i;
        break;
      }
    }
    close();
    selectElement.dispatchEvent(new Event('change'));
  }

  input.addEventListener('focus', () => {
    input.select();
    open();
  });

  input.addEventListener('input', () => {
    buildList(input.value);
    list.classList.remove('hidden');
  });

  list.addEventListener('mousedown', (e) => {
    const li = e.target.closest('li');
    if (!li) return;
    selectMunicipality(li.textContent, li.dataset.rate);
  });

  // Close on outside click
  document.addEventListener('mousedown', (e) => {
    if (!wrapper.contains(e.target)) {
      // Reset input to current selection if user didn't pick
      input.value = selectElement.options[selectElement.selectedIndex].text;
      close();
    }
  });

  // Keyboard navigation
  input.addEventListener('keydown', (e) => {
    const items = list.querySelectorAll('li');
    const active = list.querySelector('.bg-blue-200');
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!items.length) return;
      const next = active ? active.nextElementSibling || items[0] : items[0];
      if (active) active.classList.remove('bg-blue-200');
      next.classList.add('bg-blue-200');
      next.scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!items.length) return;
      const prev = active ? active.previousElementSibling || items[items.length - 1] : items[items.length - 1];
      if (active) active.classList.remove('bg-blue-200');
      prev.classList.add('bg-blue-200');
      prev.scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (active) {
        selectMunicipality(active.textContent, active.dataset.rate);
      } else if (items.length === 1) {
        selectMunicipality(items[0].textContent, items[0].dataset.rate);
      }
    } else if (e.key === 'Escape') {
      input.value = selectElement.options[selectElement.selectedIndex].text;
      close();
      input.blur();
    }
  });
}

/**
 * Read form values from the tax calculator form.
 * @param {HTMLFormElement} form
 * @returns {{ monthlySalary: number, municipalTaxRate: number, municipalityName: string }}
 */
export function readFormValues(form) {
  const selectElement = form.querySelector('#komm');
  const selectedOption = selectElement.options[selectElement.selectedIndex];

  return {
    monthlySalary: Number(form.lon.value),
    municipalTaxRate: Number(selectedOption.value),
    municipalityName: selectedOption.text,
  };
}

/**
 * Apply URL query parameters to the form.
 * Supports `?manadslon=X` to pre-fill salary.
 * @param {HTMLFormElement} form
 */
export function applyUrlParameters(form) {
  const params = new URL(window.location.href).searchParams;

  if (params.has('manadslon')) {
    let salary = Number(params.get('manadslon'));
    if (!isNaN(salary) && salary > 0) {
      salary = Math.round(salary / 1000) * 1000;
      if (salary > 100000) salary = 100000;
      form.lon.value = salary;
    }
  }
}

/**
 * Render an error message in the results container.
 * @param {HTMLElement} container
 * @param {string} message
 */
export function renderError(container, message) {
  container.innerHTML = `<p class="text-red-600 text-lg font-semibold">${message}</p>`;
}

/**
 * Build the 4 cost categories from a breakdown.
 * @param {object} breakdown
 * @returns {{ categories: Array<{name:string,value:number,color:string}>, total: number }}
 */
function buildCategories(breakdown) {
  const total = breakdown.totalEmployerCost;
  const incomeTax = breakdown.incomeTax + breakdown.pensionContribution
    + breakdown.burialFee + breakdown.publicServiceFee
    - breakdown.regionalReduction;

  return {
    total,
    categories: [
      { name: 'Arbetsgivaravgifter',   label: ['Arbetsgivar-', 'avgifter'],        value: breakdown.employerContribution, color: '#5C5D6E' },
      { name: 'Inkomstskatt',          label: ['Inkomst-', 'skatt'],               value: incomeTax,                      color: '#F9423A' },
      { name: 'Moms och punktskatter', label: ['Moms', 'och punkt-', 'skatter'],   value: breakdown.vat,                  color: '#F5A623' },
      { name: 'Kvar efter skatt',      label: ['Kvar', 'efter', 'skatt'],          value: breakdown.netAnnualIncome - breakdown.vat, color: '#2BA784' },
    ],
  };
}

/**
 * Render a donut chart as an SVG with percentage labels.
 * @param {Array} categories
 * @param {number} total
 * @returns {string} HTML string
 */
function renderDonut(categories, total) {
  const w = 600;
  const h = 360;
  const cx = w / 2;
  const cy = h / 2;
  const outerR = 120;
  const innerR = 52;
  const labelR = (outerR + innerR) / 2;

  let angle = -90;
  const arcs = [];
  const labels = [];

  for (const c of categories) {
    const pct = (c.value / total) * 100;
    const sweep = (pct / 100) * 360;
    const startAngle = angle;
    const endAngle = angle + sweep;

    const startRad = (startAngle * Math.PI) / 180;
    const endRad = (endAngle * Math.PI) / 180;
    const largeArc = sweep > 180 ? 1 : 0;

    const x1o = cx + outerR * Math.cos(startRad);
    const y1o = cy + outerR * Math.sin(startRad);
    const x2o = cx + outerR * Math.cos(endRad);
    const y2o = cy + outerR * Math.sin(endRad);
    const x1i = cx + innerR * Math.cos(endRad);
    const y1i = cy + innerR * Math.sin(endRad);
    const x2i = cx + innerR * Math.cos(startRad);
    const y2i = cy + innerR * Math.sin(startRad);

    arcs.push(`<path d="M${x1o},${y1o} A${outerR},${outerR} 0 ${largeArc},1 ${x2o},${y2o} L${x1i},${y1i} A${innerR},${innerR} 0 ${largeArc},0 ${x2i},${y2i} Z" fill="${c.color}"/>`);

    // Percentage inside the ring
    const midRad = ((startAngle + endAngle) / 2 * Math.PI) / 180;
    const lx = cx + labelR * Math.cos(midRad);
    const ly = cy + labelR * Math.sin(midRad);
    if (pct >= 8) {
      labels.push(`<text x="${lx.toFixed(1)}" y="${ly.toFixed(1)}" text-anchor="middle" dominant-baseline="central" fill="white" font-size="17" font-weight="700" style="filter:drop-shadow(0 1px 2px rgba(0,0,0,0.5))">${pct.toFixed(1).replace('.', ',')}%</text>`);
    }

    angle = endAngle;
  }

  // Outer labels with elbow lines + multiline tspans
  angle = -90;
  const outerLabels = [];
  const lh = 21;
  for (const c of categories) {
    const pct = (c.value / total) * 100;
    const sweep = (pct / 100) * 360;
    const midAngle = angle + sweep / 2;
    const midRad = (midAngle * Math.PI) / 180;
    const cosM = Math.cos(midRad);
    const sinM = Math.sin(midRad);
    const right = cosM >= 0;

    const lx1 = cx + (outerR + 4) * cosM;
    const ly1 = cy + (outerR + 4) * sinM;
    const elbowR = outerR + 25;
    const lx2 = cx + elbowR * cosM;
    const ly2 = cy + elbowR * sinM;
    const lx3 = right ? cx + elbowR + 40 : cx - elbowR - 40;
    const ly3 = ly2;
    const tx = right ? lx3 + 5 : lx3 - 5;
    const anchor = right ? 'start' : 'end';

    outerLabels.push(`<polyline points="${lx1.toFixed(1)},${ly1.toFixed(1)} ${lx2.toFixed(1)},${ly2.toFixed(1)} ${lx3.toFixed(1)},${ly3.toFixed(1)}" fill="none" stroke="${c.color}" stroke-width="1.5"/>`);

    const lines = c.label;
    const yStart = ly3 - ((lines.length - 1) * lh) / 2;
    const tspans = lines.map((line, i) =>
      `<tspan x="${tx.toFixed(1)}" y="${(yStart + i * lh).toFixed(1)}">${line}</tspan>`
    ).join('');

    outerLabels.push(`<text text-anchor="${anchor}" fill="#374151" font-size="19" font-weight="600">${tspans}</text>`);

    angle += sweep;
  }

  return `<svg viewBox="0 0 ${w} ${h}" class="w-full mx-auto">
    ${arcs.join('\n    ')}
    ${labels.join('\n    ')}
    ${outerLabels.join('\n    ')}
  </svg>`;
}

/**
 * Render a blurred, grayed-out zero state when salary is 0.
 * @returns {string} HTML string
 */
function renderZeroStateHTML() {
  // Fake categories with equal slices, all gray
  const gray = '#d1d5db';
  const fakeCategories = [
    { name: 'Arbetsgivaravgifter',   label: ['Arbetsgivar-', 'avgifter'],      value: 25, color: gray },
    { name: 'Inkomstskatt',          label: ['Inkomst-', 'skatt'],             value: 25, color: gray },
    { name: 'Moms och punktskatter', label: ['Moms', 'och punkt-', 'skatter'], value: 25, color: gray },
    { name: 'Kvar efter skatt',      label: ['Kvar', 'efter', 'skatt'],        value: 25, color: gray },
  ];

  const donut = renderDonut(fakeCategories, 100);

  const segments = fakeCategories.map(() =>
    `<div style="width:25%;background:${gray}" class="h-full"></div>`
  ).join('');

  const legendItems = fakeCategories.map(c =>
    `<div class="flex items-start gap-2">
      <span class="inline-block w-3 h-3 rounded-sm flex-shrink-0 mt-1.5" style="background:${gray}"></span>
      <span class="text-base leading-snug"><span class="font-bold">${c.name}:</span><br><span class="font-semibold">0 kr</span> <span class="font-light">(0,0%)</span></span>
    </div>`
  ).join('');

  return `<div class="mt-6 mb-4">
    <h2 class="text-xl font-bold mb-3">Du har <span style="color:#F9423A">ingen lön!</span></h2>
    <div style="filter:blur(4px);opacity:0.6">
      <div class="mb-6">${donut}</div>
      <div class="flex h-7 rounded-lg overflow-hidden">${segments}</div>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 mt-3">${legendItems}</div>
    </div>
  </div>`;
}

/**
 * Render the zero-salary state into a container.
 * @param {HTMLElement} container
 */
export function renderZeroState(container) {
  container.innerHTML = renderZeroStateHTML();
}

/**
 * Render the donut chart, bar chart, and legend.
 * @param {object} breakdown - Result from calculateTaxBreakdown()
 * @returns {string} HTML string
 */
function renderGraph(breakdown) {
  const { categories, total } = buildCategories(breakdown);
  if (total <= 0) return renderZeroStateHTML();

  // Donut
  const donut = renderDonut(categories, total);

  // Bar segments
  const segments = categories.map(c => {
    const pct = (c.value / total) * 100;
    return `<div style="width:${pct.toFixed(2)}%;background:${c.color}" class="h-full"></div>`;
  }).join('');

  // Legend grid
  const legendItems = categories.map(c => {
    const pct = ((c.value / total) * 100).toFixed(1).replace('.', ',');
    const monthly = formatRounded(c.value / 12);
    return `<div class="flex items-start gap-2">
      <span class="inline-block w-3 h-3 rounded-sm flex-shrink-0 mt-1.5" style="background:${c.color}"></span>
      <span class="text-base leading-snug"><span class="font-bold">${c.name}:</span><br><span class="font-semibold">${monthly} kr</span> <span class="font-light">(${pct}%)</span></span>
    </div>`;
  }).join('');

  return `<div class="mt-6 mb-4">
    <h2 class="text-xl font-bold mb-3">Din skatt:</h2>
    <div class="mb-6">${donut}</div>
    <div class="flex h-7 rounded-lg overflow-hidden">${segments}</div>
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 mt-3">${legendItems}</div>
  </div>`;
}

/**
 * Render the full tax breakdown as an HTML table.
 * All values displayed monthly (÷12), matching the original output format.
 * @param {HTMLElement} container
 * @param {object} breakdown - Result from calculateTaxBreakdown()
 */
export function renderResults(container, breakdown) {
  let output = '';
  let rowIndex = 0;

  output += renderGraph(breakdown);
  output += '<h2 class="text-xl font-bold mt-6 mb-3">Dina skatter</h2>';
  output += '<div class="overflow-x-auto">';
  output += '<table class="w-full text-sm sm:text-base">';

  // Arbetsgivarens kostnad
  output += row('Arbetsgivarens kostnad', breakdown.totalEmployerCost / 12, true, rowIndex++);
  output += row('Arbetsgivaravgifter', -breakdown.employerContribution / 12, false, rowIndex++);

  // Din månadslön
  output += row('Din månadslön', breakdown.annualIncome / 12, true, rowIndex++);
  output += row('Kommunalskatt', -breakdown.municipalTax / 12, false, rowIndex++);
  output += row('Jobbskatteavdrag', breakdown.jobbskatteavdrag / 12, false, rowIndex++);

  // Conditional rows
  if (breakdown.employmentIncomeReduction > 0) {
    output += row('Skattereduktion för förvärvsinkomst', breakdown.employmentIncomeReduction / 12, false, rowIndex++);
  }

  if (breakdown.stateTax > 0) {
    output += row('Statlig inkomstskatt', -breakdown.stateTax / 12, false, rowIndex++);
  }

  if (breakdown.pensionContribution > 0) {
    output += row('Allmän pensionsavgift', -breakdown.pensionContribution / 12, false, rowIndex++);
  }

  // Regional reduction (always shown)
  output += row('Skattereduktion för boende i vissa områden', breakdown.regionalReduction / 12, false, rowIndex++);

  if (breakdown.burialFee > 0) {
    output += row('Begravningsavgift', -breakdown.burialFee / 12, false, rowIndex++);
  }

  if (breakdown.publicServiceFee > 0) {
    output += row('Public service-avgift', -breakdown.publicServiceFee / 12, false, rowIndex++);
  }

  // Lön efter skatt
  output += row('Lön efter skatt', breakdown.netAnnualIncome / 12, true, rowIndex++);

  // Moms
  output += row('Moms och punktskatter*', -breakdown.vat / 12, false, rowIndex++);

  // Kvar efter alla skatter
  output += row('Kvar efter alla skatter', (breakdown.netAnnualIncome - breakdown.vat) / 12, true, rowIndex++);

  // Summa skatter
  output += `<tr class="border-t-2 border-red-300 ${rowIndex % 2 === 1 ? 'bg-gray-200' : ''}">
    <td class="py-2 text-red-600 font-bold">Summa skatter</td>
    <td class="py-2 text-right text-red-600 font-bold">${formatRounded(-breakdown.totalTax / 12)}</td>
  </tr>`;

  output += '</table></div>';
  output += '<p class="text-sm text-gray-600 mt-2">* Beräknat på snittet i befolkningen.</p>';

  container.innerHTML = output;
}

/**
 * Build a table row with explicit alternating background.
 * @param {string} label
 * @param {number} value - Monthly value
 * @param {boolean} bold
 * @param {number} index - Row index for alternating background
 * @returns {string} HTML table row
 */
function row(label, value, bold, index) {
  const cls = bold ? 'font-bold' : '';
  const bg = index % 2 === 1 ? 'bg-gray-200' : '';
  return `<tr class="border-t border-gray-300 ${bg}">
    <td class="py-2 ${cls}">${label}</td>
    <td class="py-2 text-right ${cls}">${formatRounded(value)}</td>
  </tr>`;
}
