import { INKOMSTÅR, STANDARD_INKOMSTÅR } from './constants.js?v=0.32';
import { formateraAvrundat } from './utils.js?v=0.32';

/**
 * Generisk sökbar rullgardinsmeny-fabrik.
 * Binder händelselyssnare en gång och returnerar en uppdatera()-funktion
 * som kan anropas upprepade gånger för att byta datakälla.
 *
 * @param {object} opts
 * @param {HTMLElement} opts.wrapper - Wrapper-div
 * @param {HTMLInputElement} opts.input - Sökfältet
 * @param {HTMLElement} opts.list - UL-element för listan
 * @param {HTMLSelectElement} opts.select - Dold select
 * @returns {function} uppdatera(poster, etikettFn, värdeFn) — byt poster
 */
function skapaVäljare({ wrapper, input, list, select }) {
  // Aktuellt tillstånd — uppdateras via returnerad funktion
  let poster = [];
  let etikettFn = () => '';
  let värdeFn = () => '';

  function fyllSelect() {
    select.innerHTML = '';
    for (const post of poster) {
      const option = document.createElement('option');
      option.value = värdeFn(post);
      option.textContent = etikettFn(post);
      select.appendChild(option);
    }
    if (select.options.length) {
      input.value = select.options[0].text;
    }
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
      li.className = 'px-3 py-2 cursor-pointer hover:bg-blue-100';
      list.appendChild(li);
    }
  }

  function öppna() {
    byggLista(input.value === select.options[select.selectedIndex]?.text ? '' : input.value);
    list.classList.remove('hidden');
  }

  function stäng() {
    list.classList.add('hidden');
  }

  function välj(namn, värde) {
    input.value = namn;
    for (let i = 0; i < select.options.length; i++) {
      if (select.options[i].value === String(värde)) {
        select.selectedIndex = i;
        break;
      }
    }
    stäng();
    select.dispatchEvent(new Event('change'));
  }

  // Bind händelselyssnare en enda gång
  input.addEventListener('focus', () => {
    input.select();
    öppna();
  });

  input.addEventListener('input', () => {
    byggLista(input.value);
    list.classList.remove('hidden');
  });

  list.addEventListener('mousedown', (e) => {
    const li = e.target.closest('li');
    if (!li) return;
    välj(li.textContent, li.dataset.value);
  });

  document.addEventListener('mousedown', (e) => {
    if (!wrapper.contains(e.target)) {
      if (select.options.length) {
        input.value = select.options[select.selectedIndex].text;
      }
      stäng();
    }
  });

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
        välj(active.textContent, active.dataset.value);
      } else if (items.length === 1) {
        välj(items[0].textContent, items[0].dataset.value);
      }
    } else if (e.key === 'Escape') {
      if (select.options.length) {
        input.value = select.options[select.selectedIndex].text;
      }
      stäng();
      input.blur();
    }
  });

  /** Byt poster och fyll om select + input. */
  return function uppdatera(nyaPoster, nyEtikettFn, nyVärdeFn) {
    poster = nyaPoster;
    etikettFn = nyEtikettFn;
    värdeFn = nyVärdeFn;
    fyllSelect();
    stäng();
  };
}

/**
 * Fyll den dolda <select>-listan och koppla ihop den sökbara rullgardinsmenyn.
 * @param {HTMLSelectElement} selectElement
 * @param {number} [inkomstår]
 */
export function fyllKommunväljare(selectElement, inkomstår = STANDARD_INKOMSTÅR) {
  const uppdatera = skapaVäljare({
    wrapper: document.querySelector('#komm-wrapper'),
    input: document.querySelector('#komm-search'),
    list: document.querySelector('#komm-list'),
    select: selectElement,
  });
  uppdatera(INKOMSTÅR[inkomstår].kommuner, k => k.namn, k => k.skattesats);
}

// Församlingsväljare — skapas en gång, uppdateras vid kommunkbyte
let _uppdateraFörsamling = null;

/**
 * Fyll församlingsväljaren för vald kommun.
 * @param {HTMLSelectElement} selectElement
 * @param {string} kommunNamn
 * @param {number} [inkomstår]
 */
export function fyllFörsamlingsväljare(selectElement, kommunNamn, inkomstår = STANDARD_INKOMSTÅR) {
  const data = INKOMSTÅR[inkomstår];
  const församlingar = data.församlingar?.[kommunNamn] || [];

  if (!_uppdateraFörsamling) {
    _uppdateraFörsamling = skapaVäljare({
      wrapper: document.querySelector('#forsamling-wrapper'),
      input: document.querySelector('#forsamling-search'),
      list: document.querySelector('#forsamling-list'),
      select: selectElement,
    });
  }
  _uppdateraFörsamling(församlingar, f => f.namn, f => f.kyrkoavgift);
}

/**
 * Läs formulärvärden från skatteberäkningsformuläret.
 * @param {HTMLFormElement} form
 * @returns {{ månadslön: number, kommunalSkattesats: number, kommunNamn: string, kyrkoavgiftSats: number }}
 */
export function läsFormulärVärden(form) {
  const selectElement = form.querySelector('#komm');
  const selectedOption = selectElement.options[selectElement.selectedIndex];

  let kyrkoavgiftSats = 0;
  const kyrkomedlem = document.querySelector('#kyrkomedlem');
  if (kyrkomedlem?.checked) {
    const församlingSelect = document.querySelector('#forsamling');
    if (församlingSelect?.options.length) {
      kyrkoavgiftSats = Number(församlingSelect.options[församlingSelect.selectedIndex].value) || 0;
    }
  }

  return {
    månadslön: Number(form.lon.value),
    kommunalSkattesats: Number(selectedOption.value),
    kommunNamn: selectedOption.text,
    kyrkoavgiftSats,
  };
}

/**
 * Tillämpa URL-parametrar på formuläret.
 * Stödjer `?manadslon=X` för att förifylla lön.
 * @param {HTMLFormElement} form
 */
export function tillämpUrlParametrar(form) {
  const params = new URL(window.location.href).searchParams;

  if (params.has('manadslon')) {
    let lön = Number(params.get('manadslon'));
    if (!isNaN(lön) && lön > 0) {
      lön = Math.round(lön / 1000) * 1000;
      if (lön > 100000) lön = 100000;
      form.lon.value = lön;
    }
  }
}

/**
 * Visa felmeddelande i resultatbehållaren.
 * @param {HTMLElement} container
 * @param {string} meddelande
 */
export function visaFelmeddelande(container, meddelande) {
  container.innerHTML = `<p class="text-red-600 text-lg font-semibold">${meddelande}</p>`;
}

/**
 * Bygg de 4 kostnadskategorierna från en uppdelning.
 * @param {object} uppdelning
 * @returns {{ kategorier: Array<{name:string,value:number,color:string}>, total: number }}
 */
function byggKategorier(uppdelning) {
  const total = uppdelning.totalArbetsgivarkostnad;
  const inkomstskatt = uppdelning.inkomstskatt + uppdelning.pensionsavgift
    + uppdelning.begravningsavgift + uppdelning.kyrkoavgift + uppdelning.publicServiceAvgift
    - uppdelning.regionalReduktion;

  return {
    total,
    kategorier: [
      { name: 'Arbetsgivaravgifter',   label: ['Arbetsgivar-', 'avgifter'],        value: uppdelning.arbetsgivaravgift, color: '#5C5D6E' },
      { name: 'Inkomstskatt',          label: ['Inkomst-', 'skatt'],               value: inkomstskatt,                 color: '#F9423A' },
      { name: 'Moms och punktskatter', label: ['Moms', 'och punkt-', 'skatter'],   value: uppdelning.moms,              color: '#F5A623' },
      { name: 'Kvar efter skatt',      label: ['Kvar', 'efter', 'skatt'],          value: uppdelning.nettoÅrsinkomst - uppdelning.moms, color: '#2BA784' },
    ],
  };
}

/**
 * Rita ett munkdiagram som SVG med procentetiketter.
 * @param {Array} kategorier
 * @param {number} total
 * @returns {string} HTML-sträng
 */
function ritaMunkdiagram(kategorier, total) {
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

  for (const c of kategorier) {
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

    // Procent inuti ringen
    const midRad = ((startAngle + endAngle) / 2 * Math.PI) / 180;
    const lx = cx + labelR * Math.cos(midRad);
    const ly = cy + labelR * Math.sin(midRad);
    if (pct >= 8) {
      labels.push(`<text x="${lx.toFixed(1)}" y="${ly.toFixed(1)}" text-anchor="middle" dominant-baseline="central" fill="white" font-size="17" font-weight="700" style="filter:drop-shadow(0 1px 2px rgba(0,0,0,0.5))">${pct.toFixed(1).replace('.', ',')}%</text>`);
    }

    angle = endAngle;
  }

  // Yttre etiketter med armbågslinjer + flerradiga tspans
  angle = -90;
  const outerLabels = [];
  const lh = 21;
  for (const c of kategorier) {
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
 * Rita ett suddat, grått nolläge när lönen är 0.
 * @returns {string} HTML-sträng
 */
function ritaNolllägeHTML() {
  // Fejkkategorier med lika delar, alla gråa
  const gray = '#d1d5db';
  const fejkKategorier = [
    { name: 'Arbetsgivaravgifter',   label: ['Arbetsgivar-', 'avgifter'],      value: 25, color: gray },
    { name: 'Inkomstskatt',          label: ['Inkomst-', 'skatt'],             value: 25, color: gray },
    { name: 'Moms och punktskatter', label: ['Moms', 'och punkt-', 'skatter'], value: 25, color: gray },
    { name: 'Kvar efter skatt',      label: ['Kvar', 'efter', 'skatt'],        value: 25, color: gray },
  ];

  const donut = ritaMunkdiagram(fejkKategorier, 100);

  const segments = fejkKategorier.map(() =>
    `<div style="width:25%;background:${gray}" class="h-full"></div>`
  ).join('');

  const legendItems = fejkKategorier.map(c =>
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
 * Visa nollöneläget i en behållare.
 * @param {HTMLElement} container
 */
export function visaNollläge(container) {
  container.innerHTML = ritaNolllägeHTML();
}

/**
 * Rita munkdiagram, stapeldiagram och förklaring.
 * @param {object} uppdelning - Resultat från beräknaSkatteuppdelning()
 * @returns {string} HTML-sträng
 */
function ritaGraf(uppdelning) {
  const { kategorier, total } = byggKategorier(uppdelning);
  if (total <= 0) return ritaNolllägeHTML();

  // Munkdiagram
  const donut = ritaMunkdiagram(kategorier, total);

  // Stapelsegment
  const segments = kategorier.map(c => {
    const pct = (c.value / total) * 100;
    return `<div style="width:${pct.toFixed(2)}%;background:${c.color}" class="h-full"></div>`;
  }).join('');

  // Förklaringsrutnät
  const legendItems = kategorier.map(c => {
    const pct = ((c.value / total) * 100).toFixed(1).replace('.', ',');
    const monthly = formateraAvrundat(c.value / 12);
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
 * Visa fullständig skatteuppdelning som HTML-tabell.
 * Alla värden visas per månad (÷12), matchande originalformatet.
 * @param {HTMLElement} container
 * @param {object} uppdelning - Resultat från beräknaSkatteuppdelning()
 */
export function visaResultat(container, uppdelning) {
  let output = '';
  let rowIndex = 0;

  output += ritaGraf(uppdelning);
  output += '<h2 class="text-xl font-bold mt-6 mb-3">Dina skatter</h2>';
  output += '<div class="overflow-x-auto">';
  output += '<table class="w-full text-sm sm:text-base">';

  // Arbetsgivarens kostnad
  output += tabellrad('Arbetsgivarens kostnad', uppdelning.totalArbetsgivarkostnad / 12, true, rowIndex++);
  output += tabellrad('Arbetsgivaravgifter', -uppdelning.arbetsgivaravgift / 12, false, rowIndex++);

  // Din månadslön
  output += tabellrad('Din månadslön', uppdelning.årsinkomst / 12, true, rowIndex++);
  output += tabellrad('Kommunalskatt', -uppdelning.kommunalskatt / 12, false, rowIndex++);
  output += tabellrad('Jobbskatteavdrag', uppdelning.jobbskatteavdrag / 12, false, rowIndex++);

  // Villkorliga rader
  if (uppdelning.skattereduktionFörvärvsinkomst > 0) {
    output += tabellrad('Skattereduktion för förvärvsinkomst', uppdelning.skattereduktionFörvärvsinkomst / 12, false, rowIndex++);
  }

  if (uppdelning.statligSkatt > 0) {
    output += tabellrad('Statlig inkomstskatt', -uppdelning.statligSkatt / 12, false, rowIndex++);
  }

  if (uppdelning.pensionsavgift > 0) {
    output += tabellrad('Allmän pensionsavgift', -uppdelning.pensionsavgift / 12, false, rowIndex++);
  }

  // Regional reduktion (visas alltid)
  output += tabellrad('Skattereduktion för boende i vissa områden', uppdelning.regionalReduktion / 12, false, rowIndex++);

  if (uppdelning.begravningsavgift > 0) {
    output += tabellrad('Begravningsavgift', -uppdelning.begravningsavgift / 12, false, rowIndex++);
  }

  if (uppdelning.kyrkoavgift > 0) {
    output += tabellrad('Kyrkoavgift', -uppdelning.kyrkoavgift / 12, false, rowIndex++);
  }

  if (uppdelning.publicServiceAvgift > 0) {
    output += tabellrad('Public service-avgift', -uppdelning.publicServiceAvgift / 12, false, rowIndex++);
  }

  // Lön efter skatt
  output += tabellrad('Lön efter skatt', uppdelning.nettoÅrsinkomst / 12, true, rowIndex++);

  // Moms
  output += tabellrad('Moms och punktskatter*', -uppdelning.moms / 12, false, rowIndex++);

  // Kvar efter alla skatter
  output += tabellrad('Kvar efter alla skatter', (uppdelning.nettoÅrsinkomst - uppdelning.moms) / 12, true, rowIndex++);

  // Summa skatter
  output += `<tr class="border-t-2 border-red-300 ${rowIndex % 2 === 1 ? 'bg-gray-200' : ''}">
    <td class="py-2 text-red-600 font-bold">Summa skatter</td>
    <td class="py-2 text-right text-red-600 font-bold">${formateraAvrundat(-uppdelning.totalSkatt / 12)}</td>
  </tr>`;

  output += '</table></div>';
  output += '<p class="text-sm text-gray-600 mt-2">* Beräknat på snittet i befolkningen.</p>';

  container.innerHTML = output;
}

/**
 * Bygg en tabellrad med alternerande bakgrund.
 * @param {string} etikett
 * @param {number} värde - Månadsvärde
 * @param {boolean} fet
 * @param {number} index - Radindex för alternerande bakgrund
 * @returns {string} HTML-tabellrad
 */
function tabellrad(etikett, värde, fet, index) {
  const cls = fet ? 'font-bold' : '';
  const bg = index % 2 === 1 ? 'bg-gray-200' : '';
  return `<tr class="border-t border-gray-300 ${bg}">
    <td class="py-2 ${cls}">${etikett}</td>
    <td class="py-2 text-right ${cls}">${formateraAvrundat(värde)}</td>
  </tr>`;
}
