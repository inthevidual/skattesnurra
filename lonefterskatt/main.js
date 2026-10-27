import { INKOMSTÅR, STANDARD_INKOMSTÅR } from '../js/constants.js?v=0.666';
import { beräknaSkatteuppdelning } from '../js/tax-engine.js?v=0.666';
import { formateraAvrundat } from '../js/utils.js?v=0.666';

const STORAGE_KEY = 'lonefterskatt';
let exaktLön = null;
let kommunVald = false;

// ── Formatting ─────────────────────────────────────────────────────

function formateraInmatning(n) {
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '\u2009');
}

function tolkLön(s) {
  return Number(s.replace(/\s/g, ''));
}

// ── Searchable dropdown ────────────────────────────────────────────

function skapaVäljare({ wrapper, input, list, select }) {
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
      li.className = 'px-3 py-2 cursor-pointer hover:bg-blue-100 text-lg';
      list.appendChild(li);
    }
  }

  function öppna() {
    const matchesSelection = select.selectedIndex >= 0 &&
      input.value === select.options[select.selectedIndex]?.text;
    byggLista(matchesSelection || !input.value ? '' : input.value);
    list.classList.remove('hidden');
  }

  function stäng() {
    list.classList.add('hidden');
  }

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
      if (select.selectedIndex >= 0) {
        input.value = select.options[select.selectedIndex].text;
      } else {
        input.value = '';
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
      if (select.selectedIndex >= 0) {
        input.value = select.options[select.selectedIndex].text;
      } else {
        input.value = '';
      }
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

// ── Kommun / församling / år ───────────────────────────────────────

let _uppdateraKommun = null;
let _uppdateraFörsamling = null;

function hämtaKommuner(inkomstår) {
  const kommuner = [...INKOMSTÅR[inkomstår].kommuner];
  const riksIdx = kommuner.findIndex(k => k.namn === 'Riksgenomsnitt');
  if (riksIdx > -1) {
    const [riks] = kommuner.splice(riksIdx, 1);
    kommuner.push(riks);
  }
  return kommuner;
}

function fyllKommunväljare(selectElement, inkomstår) {
  const kommuner = hämtaKommuner(inkomstår);
  if (!_uppdateraKommun) {
    _uppdateraKommun = skapaVäljare({
      wrapper: document.querySelector('#komm-wrapper'),
      input: document.querySelector('#komm-search'),
      list: document.querySelector('#komm-list'),
      select: selectElement,
    });
  }
  _uppdateraKommun(kommuner, k => k.namn, k => k.skattesats);
}

function fyllFörsamlingsväljare(selectElement, kommunNamn, inkomstår) {
  const församlingar = INKOMSTÅR[inkomstår].församlingar?.[kommunNamn] || [];
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

function fyllÅrsväljare(selectElement) {
  selectElement.innerHTML = '';
  for (const år of Object.keys(INKOMSTÅR).sort((a, b) => b - a)) {
    const option = document.createElement('option');
    option.value = år;
    option.textContent = år;
    if (Number(år) === STANDARD_INKOMSTÅR) option.selected = true;
    selectElement.appendChild(option);
  }
}

// ── Read form values ───────────────────────────────────────────────

function läsFormulärVärden(form) {
  const selectElement = form.querySelector('#komm');
  const selectedOption = selectElement.options[selectElement.selectedIndex];
  const inkomstår = Number(document.querySelector('#inkomstar').value);

  let kyrkoavgiftSats = 0;
  const kyrkomedlem = document.querySelector('#kyrkomedlem');
  if (kyrkomedlem?.checked) {
    if (selectedOption.text === 'Riksgenomsnitt') {
      kyrkoavgiftSats = INKOMSTÅR[inkomstår].KYRKOAVGIFT_RIKSGENOMSNITT;
    } else {
      const fs = document.querySelector('#forsamling');
      if (fs?.options.length) {
        kyrkoavgiftSats = Number(fs.options[fs.selectedIndex].value) || 0;
      }
    }
  }

  return {
    månadslön: Number(form.lon.value),
    kommunalSkattesats: Number(selectedOption.value),
    kommunNamn: selectedOption.text,
    kyrkoavgiftSats,
    inkomstår,
  };
}

// ── localStorage ───────────────────────────────────────────────────

function sparaVal() {
  try {
    const form = document.querySelector('#myForm');
    const sel = form.querySelector('#komm');
    const opt = sel.selectedIndex >= 0 ? sel.options[sel.selectedIndex] : null;
    const fs = document.querySelector('#forsamling');
    const fOpt = fs?.selectedIndex >= 0 ? fs.options[fs.selectedIndex] : null;

    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      inkomstår: document.querySelector('#inkomstar').value,
      kommunNamn: kommunVald ? opt?.text : null,
      månadslön: exaktLön !== null ? exaktLön : Number(form.lon.value),
      kyrkomedlem: document.querySelector('#kyrkomedlem').checked,
      församlingsNamn: fOpt?.text || null,
    }));
  } catch (e) { /* localStorage may be unavailable */ }
}

function laddaSparadeVal() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)); }
  catch (e) { return null; }
}

// ── Marginal tax ───────────────────────────────────────────────────

function beräknaMarginalskattesats(indata, inkomstår) {
  const u1 = beräknaSkatteuppdelning(indata, inkomstår);
  const u2 = beräknaSkatteuppdelning({ ...indata, månadslön: indata.månadslön + 100 }, inkomstår);
  if (!u1 || !u2) return 0;
  return ((u2.årsinkomst - u2.nettoÅrsinkomst) - (u1.årsinkomst - u1.nettoÅrsinkomst)) / (100 * 12);
}

// ── Results display ────────────────────────────────────────────────

function visaResultat(container, uppdelning, månadslön, marginalskatt) {
  const m = 12;
  const nettoMånadslön = Math.round(uppdelning.nettoÅrsinkomst / m);

  let html = '';

  // Big net salary
  html += `<div class="text-center mb-8">
    <p class="text-lg text-gray-500 mb-1">Lön efter skatt</p>
    <p class="text-5xl sm:text-6xl font-bold" style="color:#2BA784">${formateraAvrundat(nettoMånadslön)} kr</p>
    <p class="text-base text-gray-400 mt-2">per månad</p>
  </div>`;

  // Tax table
  html += `<div class="bg-white border border-gray-300 rounded-lg p-4 sm:p-6 shadow-sm">`;
  html += `<h3 class="text-xl font-bold mb-4">Skatter</h3>`;
  html += `<table class="w-full text-base sm:text-lg">`;

  const rows = [];
  rows.push({ label: 'Kommunal- och regionskatt', value: uppdelning.kommunalskatt / m });
  rows.push({ label: 'Statlig skatt', value: uppdelning.statligSkatt / m });
  rows.push({ label: 'Public service-avgift', value: uppdelning.publicServiceAvgift / m });
  if (uppdelning.kyrkoavgift > 0) {
    rows.push({ label: 'Kyrkoavgift', value: uppdelning.kyrkoavgift / m });
  }
  rows.push({ label: 'Begravningsavgift', value: uppdelning.begravningsavgift / m });
  rows.push({ label: 'Jobbskatteavdrag', value: -uppdelning.jobbskatteavdrag / m });
  if (uppdelning.skattereduktionFörvärvsinkomst > 0) {
    rows.push({ label: 'Skattereduktion', value: -uppdelning.skattereduktionFörvärvsinkomst / m });
  }
  if (uppdelning.tillfälligtJobbskatteavdrag > 0) {
    rows.push({ label: 'Tillfälligt jobbskatteavdrag', value: -uppdelning.tillfälligtJobbskatteavdrag / m });
  }
  if (uppdelning.regionalReduktion > 0) {
    rows.push({ label: 'Regional skattereduktion', value: -uppdelning.regionalReduktion / m });
  }
  if (uppdelning.pensionsavgift > 0) {
    rows.push({ label: 'Allmän pensionsavgift', value: uppdelning.pensionsavgift / m });
  }

  for (let i = 0; i < rows.length; i++) {
    const bg = i % 2 === 0 ? '' : 'bg-gray-100';
    html += `<tr class="border-t border-gray-300 ${bg}">
      <td class="py-3 font-medium text-gray-800">${rows[i].label}</td>
      <td class="py-3 text-right font-semibold tabular-nums text-gray-900">${formateraAvrundat(rows[i].value)} kr</td>
    </tr>`;
  }

  // Summa
  const summa = Math.round((uppdelning.årsinkomst - uppdelning.nettoÅrsinkomst) / m);
  const summaIProcent = summa / månadslön * 100;
  const marginalProcent = marginalskatt * 100;
  const n = rows.length;

  const summaBg = n % 2 === 0 ? '' : 'bg-gray-100';
  html += `<tr class="border-t-2 border-gray-900 ${summaBg}">
    <td class="py-3 font-bold text-gray-900">Summa</td>
    <td class="py-3 text-right font-bold tabular-nums text-gray-900">${formateraAvrundat(summa)} kr</td>
  </tr>`;

  const pctBg = (n + 1) % 2 === 0 ? '' : 'bg-gray-100';
  html += `<tr class="border-t border-gray-300 ${pctBg}">
    <td class="py-3 font-medium text-gray-800">Summa i procent</td>
    <td class="py-3 text-right font-semibold tabular-nums text-gray-900">${summaIProcent.toFixed(2).replace('.', ',')}%</td>
  </tr>`;

  const margBg = (n + 2) % 2 === 0 ? '' : 'bg-gray-100';
  html += `<tr class="border-t border-gray-300 ${margBg}">
    <td class="py-3 font-medium text-gray-800">Marginalskatt</td>
    <td class="py-3 text-right font-semibold tabular-nums text-gray-900">${marginalProcent.toFixed(2).replace('.', ',')}%</td>
  </tr>`;

  html += `</table></div>`;
  container.innerHTML = html;
}

// ── Calculate & render ─────────────────────────────────────────────

function beräknaOchVisa(form, resultatBehållare) {
  const lön = exaktLön !== null ? exaktLön : Number(form.lon.value);

  if (!kommunVald) {
    if (lön > 0) {
      resultatBehållare.innerHTML = `<div class="bg-red-50 border border-red-300 text-red-700 rounded-lg p-4 text-center text-lg font-medium">Du måste välja en kommun</div>`;
    } else {
      resultatBehållare.innerHTML = '';
    }
    return;
  }

  if (!lön || lön <= 0) {
    resultatBehållare.innerHTML = '';
    return;
  }

  const värden = läsFormulärVärden(form);
  if (exaktLön !== null) värden.månadslön = exaktLön;

  const uppdelning = beräknaSkatteuppdelning(värden, värden.inkomstår);
  if (!uppdelning) {
    resultatBehållare.innerHTML = '';
    return;
  }

  const marginalskatt = beräknaMarginalskattesats(värden, värden.inkomstår);
  visaResultat(resultatBehållare, uppdelning, värden.månadslön, marginalskatt);
}

// ── Helpers to restore selections ──────────────────────────────────

function väljKommun(selectElement, searchInput, kommunNamn) {
  for (let i = 0; i < selectElement.options.length; i++) {
    if (selectElement.options[i].text === kommunNamn) {
      selectElement.selectedIndex = i;
      searchInput.value = kommunNamn;
      kommunVald = true;
      return true;
    }
  }
  return false;
}

function väljFörsamling(selectElement, searchInput, namn) {
  for (let i = 0; i < selectElement.options.length; i++) {
    if (selectElement.options[i].text === namn) {
      selectElement.selectedIndex = i;
      searchInput.value = namn;
      return true;
    }
  }
  return false;
}

// ── Init ───────────────────────────────────────────────────────────

function initiera() {
  const form = document.querySelector('#myForm');
  const selectElement = form.querySelector('#komm');
  const kommSearch = document.querySelector('#komm-search');
  const slider = form.querySelector('#lon');
  const edit = document.querySelector('#lon-edit');
  const resultatBehållare = document.querySelector('#resultat');
  const inkomstårSelect = document.querySelector('#inkomstar');
  const kyrkomedlem = document.querySelector('#kyrkomedlem');
  const församlingFieldset = document.querySelector('#forsamling-fieldset');
  const församlingSelect = document.querySelector('#forsamling');
  const församlingSearch = document.querySelector('#forsamling-search');

  const sparade = laddaSparadeVal();

  // Fill year selector
  fyllÅrsväljare(inkomstårSelect);
  if (sparade?.inkomstår) inkomstårSelect.value = sparade.inkomstår;

  // Fill kommun selector (Riksgenomsnitt last)
  const år = Number(inkomstårSelect.value);
  fyllKommunväljare(selectElement, år);

  // Restore kommun or start empty
  if (sparade?.kommunNamn && väljKommun(selectElement, kommSearch, sparade.kommunNamn)) {
    // Restored
  } else {
    selectElement.selectedIndex = -1;
    kommSearch.value = '';
    kommunVald = false;
  }

  // Restore salary
  if (sparade?.månadslön != null && sparade.månadslön > 0) {
    exaktLön = sparade.månadslön;
    slider.value = Math.round(sparade.månadslön / 1000) * 1000;
    edit.value = formateraInmatning(sparade.månadslön);
  } else {
    slider.value = 0;
    edit.value = formateraInmatning(0);
  }

  function hämtaKommunNamn() {
    return selectElement.selectedIndex >= 0
      ? selectElement.options[selectElement.selectedIndex].text
      : '';
  }

  function uppdateraFörsamlingsväljare() {
    const namn = hämtaKommunNamn();
    if (namn && namn !== 'Riksgenomsnitt') {
      fyllFörsamlingsväljare(församlingSelect, namn, Number(inkomstårSelect.value));
      församlingFieldset.classList.remove('hidden');
    } else {
      församlingFieldset.classList.add('hidden');
    }
  }

  // Restore kyrkomedlem
  if (sparade?.kyrkomedlem) {
    kyrkomedlem.checked = true;
    if (kommunVald && hämtaKommunNamn() !== 'Riksgenomsnitt') {
      uppdateraFörsamlingsväljare();
      if (sparade?.församlingsNamn) {
        väljFörsamling(församlingSelect, församlingSearch, sparade.församlingsNamn);
      }
    }
  }

  // ── Salary sync ──────────────────────────────────────────────────

  function synkaFrånReglage() {
    exaktLön = null;
    edit.value = formateraInmatning(Number(slider.value));
    beräknaOchVisa(form, resultatBehållare);
    sparaVal();
  }

  function synkaFrånInmatning() {
    let val = tolkLön(edit.value);
    if (isNaN(val) || val < 0) val = 0;
    if (val > 100000) val = 100000;
    exaktLön = val;
    slider.value = Math.round(val / 1000) * 1000;
    edit.value = formateraInmatning(val);
    beräknaOchVisa(form, resultatBehållare);
    sparaVal();
  }

  slider.addEventListener('input', synkaFrånReglage);
  edit.addEventListener('change', synkaFrånInmatning);
  edit.addEventListener('blur', synkaFrånInmatning);

  let inmatningsTimer = null;
  edit.addEventListener('input', () => {
    clearTimeout(inmatningsTimer);
    inmatningsTimer = setTimeout(() => {
      let val = tolkLön(edit.value);
      if (!isNaN(val) && val >= 0) {
        if (val > 100000) val = 100000;
        exaktLön = val;
        slider.value = Math.round(val / 1000) * 1000;
        beräknaOchVisa(form, resultatBehållare);
        sparaVal();
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

  form.addEventListener('submit', (e) => e.preventDefault());

  // ── Kommun selection ─────────────────────────────────────────────

  selectElement.addEventListener('change', () => {
    kommunVald = true;
    if (kyrkomedlem.checked) uppdateraFörsamlingsväljare();
    beräknaOchVisa(form, resultatBehållare);
    sparaVal();
  });

  // ── Församling ───────────────────────────────────────────────────

  kyrkomedlem.addEventListener('change', () => {
    if (kyrkomedlem.checked && kommunVald) {
      uppdateraFörsamlingsväljare();
    } else {
      församlingFieldset.classList.add('hidden');
    }
    beräknaOchVisa(form, resultatBehållare);
    sparaVal();
  });

  församlingSelect.addEventListener('change', () => {
    beräknaOchVisa(form, resultatBehållare);
    sparaVal();
  });

  // ── Year change ──────────────────────────────────────────────────

  inkomstårSelect.addEventListener('change', () => {
    const prevKommun = kommunVald ? hämtaKommunNamn() : null;
    fyllKommunväljare(selectElement, Number(inkomstårSelect.value));

    if (prevKommun && väljKommun(selectElement, kommSearch, prevKommun)) {
      // Restored
    } else {
      selectElement.selectedIndex = -1;
      kommSearch.value = '';
      kommunVald = false;
    }

    if (kyrkomedlem.checked && kommunVald) uppdateraFörsamlingsväljare();
    beräknaOchVisa(form, resultatBehållare);
    sparaVal();
  });

  // ── Initial render ───────────────────────────────────────────────

  beräknaOchVisa(form, resultatBehållare);
}

document.addEventListener('DOMContentLoaded', initiera);
