import { ritaMunkdiagram } from './ui.js';
import { formateraAvrundat } from './utils.js';
import { DECADE_COMMENTARY } from '../data/historik.js';

/**
 * Bygg donut-kategorier från historiskt resultat.
 * Filtrerar bort nollvärden.
 */
function byggHistoriskaKategorier(r) {
  const kategorier = [];

  // Statlig skatt vid 12 o'clock; moms mellan arbetsgivaravgifter och kommunalskatt
  if (r.centralTax > 0)
    kategorier.push({ name: 'Statlig skatt', label: ['Statlig', 'skatt'], value: r.centralTax, color: '#C2625E' });

  kategorier.push({ name: 'Kvar efter skatt', label: ['Kvar', 'efter', 'skatt'], value: r.netAfterAllTax, color: '#2BA784' });

  if (r.payrollTax > 0)
    kategorier.push({ name: 'Arbetsgivaravgifter', label: ['Arbetsgivar-', 'avgifter'], arm: 20, value: r.payrollTax, color: '#5C5D6E' });
  if (r.vat > 0)
    kategorier.push({ name: 'Moms', label: ['Moms'], value: r.vat, color: '#F5A623' });
  if (r.municipalTax - r.eitc > 0)
    kategorier.push({ name: 'Kommunalskatt', label: ['Kommunal-', 'skatt'], value: r.municipalTax - r.eitc, color: '#F9423A' });
  if (r.employeeFees > 0)
    kategorier.push({ name: 'Allm. egenavgifter', label: ['Allmänna', 'egenavgifter'], arm: 20, value: r.employeeFees, color: '#7B5EA7' });

  return kategorier;
}

/**
 * Tabellrad med tre kolumner och alternerande bakgrund.
 */
function tabellrad3(etikett, värdeDagens, värdePeriod, fet, index) {
  const cls = fet ? 'font-bold' : '';
  const bg = index % 2 === 1 ? 'bg-gray-200' : '';
  return `<tr class="border-t border-gray-300 ${bg}">
    <td class="py-2 ${cls}">${etikett}</td>
    <td class="py-2 text-right ${cls}">${formateraAvrundat(värdeDagens)}</td>
    <td class="py-2 text-right ${cls}">${formateraAvrundat(värdePeriod)}</td>
  </tr>`;
}

/**
 * Visa historiskt skatteberäkningsresultat.
 * @param {HTMLElement} container
 * @param {object} r — Resultat från beräknaHistoriskSkatt()
 */
export function visaHistorisktResultat(container, r) {
  const cpi = r.cpiRatio;
  const kategorier = byggHistoriskaKategorier(r);
  const total = r.totalEmployerCost;

  let html = '';

  // Inledande text
  html += `<p class="mb-4">En årslön på <strong>${formateraAvrundat(r.realIncome)} kr</strong> i dag motsvarar <strong>${formateraAvrundat(r.periodIncome)} kr</strong> i ${r.year} års penningvärde. Av det arbetsgivaren betalade gick ${formateraAvrundat(r.averageTaxRate * 100)} procent i skatt.</p>`;

  // Donut
  html += `<div class="mb-6">${ritaMunkdiagram(kategorier, total)}</div>`;

  // Stapeldiagram
  const segments = kategorier.map(c => {
    const pct = (c.value / total) * 100;
    return `<div style="width:${pct.toFixed(2)}%;background:${c.color}" class="h-full"></div>`;
  }).join('');
  html += `<div class="flex h-7 rounded-lg overflow-hidden mb-4">${segments}</div>`;

  // Förklaringsrutnät
  const legendItems = kategorier.map(c => {
    const pct = ((c.value / total) * 100).toFixed(1).replace('.', ',');
    return `<div class="flex items-start gap-2">
      <span class="inline-block w-3 h-3 rounded-sm flex-shrink-0 mt-1.5" style="background:${c.color}"></span>
      <span class="text-base leading-snug"><span class="font-bold">${c.name}:</span> <span class="font-semibold">${formateraAvrundat(c.value / cpi)} kr</span> <span class="font-light">(${pct}%)</span></span>
    </div>`;
  }).join('');
  html += `<div class="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 mb-6">${legendItems}</div>`;

  // Tabell med tre kolumner
  html += '<h2 class="text-xl font-bold mt-6 mb-3">Dina skatter</h2>';
  html += '<div class="overflow-x-auto">';
  html += '<table class="w-full text-sm sm:text-base">';
  html += `<thead><tr class="border-b-2 border-gray-400">
    <th class="py-2 text-left">&nbsp;</th>
    <th class="py-2 text-right">I dagens<br>penningvärde</th>
    <th class="py-2 text-right">I ${r.year} års<br>penningvärde</th>
  </tr></thead>`;

  let row = 0;
  html += tabellrad3('Arbetsgivaren betalade', r.totalEmployerCost / cpi, r.totalEmployerCost, true, row++);
  html += tabellrad3('Arbetsgivaravgifter', -r.payrollTax / cpi, -r.payrollTax, false, row++);
  html += tabellrad3('Lön före skatt', r.realIncome, r.periodIncome, true, row++);
  html += tabellrad3('Kommunalskatt', -r.municipalTax / cpi, -r.municipalTax, false, row++);

  if (r.centralTax > 0)
    html += tabellrad3('Statlig inkomstskatt', -r.centralTax / cpi, -r.centralTax, false, row++);
  if (r.eitc > 0)
    html += tabellrad3('Jobbskatteavdrag', r.eitc / cpi, r.eitc, false, row++);
  if (r.employeeFees > 0)
    html += tabellrad3('Allmänna egenavgifter\u2020', -r.employeeFees / cpi, -r.employeeFees, false, row++);

  html += tabellrad3('Lön efter skatt', r.netIncome / cpi, r.netIncome, true, row++);
  html += tabellrad3('Moms*', -r.vat / cpi, -r.vat, false, row++);
  html += tabellrad3('Kvar efter alla skatter', r.netAfterAllTax / cpi, r.netAfterAllTax, true, row++);

  html += `<tr class="border-t-2 border-red-300 ${row % 2 === 1 ? 'bg-gray-200' : ''}">
    <td class="py-2 text-red-600 font-bold">Summa skatter</td>
    <td class="py-2 text-right text-red-600 font-bold">${formateraAvrundat(-r.totalTax / cpi)}</td>
    <td class="py-2 text-right text-red-600 font-bold">${formateraAvrundat(-r.totalTax)}</td>
  </tr>`;

  html += '</table></div>';
  html += '<p class="text-sm text-gray-600 mt-2">* Uppskattat efter snittet i befolkningen.</p>';
  if (r.employeeFees > 0)
    html += '<p class="text-sm text-gray-600">\u2020 Sociala avgifter (t.ex. pensionsavgift) som betalas av löntagaren.</p>';

  container.innerHTML = html;
}

/**
 * Visa decenniumkommentar.
 * @param {HTMLElement} container
 * @param {number} year
 */
export function visaDecenniumKommentar(container, year) {
  const decade = Math.floor(year / 10) * 10;
  const text = DECADE_COMMENTARY[decade];
  if (text) {
    container.innerHTML = `<div class="bg-gray-50 border border-gray-200 rounded-lg p-4 mt-4">
      <h3 class="text-base font-semibold mb-2">${decade}-talets skattepolitik</h3>
      <p class="text-sm text-gray-700 leading-relaxed">${text}</p>
    </div>`;
  } else {
    container.innerHTML = '';
  }
}
