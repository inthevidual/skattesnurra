import { calculateTaxBreakdown } from './tax-engine.js?v=0.31';
import {
  populateMunicipalityDropdown,
  readFormValues,
  applyUrlParameters,
  renderResults,
  renderError,
  renderZeroState,
} from './ui.js?v=0.31';

/**
 * Run the tax calculation and render results.
 * @param {HTMLFormElement} form
 * @param {HTMLElement} resultsContainer
 */
// When the user types an exact salary, store it here so it overrides the slider's rounded value.
let exactSalary = null;

function calculate(form, resultsContainer) {
  const values = readFormValues(form);
  if (exactSalary !== null) values.monthlySalary = exactSalary;

  if (values.monthlySalary == null || isNaN(values.monthlySalary) || values.monthlySalary < 0) {
    resultsContainer.innerHTML = '';
    return;
  }

  if (values.monthlySalary === 0) {
    renderZeroState(resultsContainer);
    return;
  }

  const breakdown = calculateTaxBreakdown(values);

  if (!breakdown) {
    renderError(resultsContainer, 'Skriv bara siffror utan mellanslag eller kommatecken.');
    return;
  }

  renderResults(resultsContainer, breakdown);
}

/**
 * Format a number with thin-space thousands separators for the editable input.
 * Uses actual Unicode thin space (not HTML entity) since this goes into an input value.
 */
function formatInputValue(n) {
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '\u2009');
}

/**
 * Parse a salary string back to a number, stripping any whitespace.
 */
function parseSalary(str) {
  return Number(str.replace(/\s/g, ''));
}

function init() {
  const form = document.querySelector('#myForm');
  const selectElement = form.querySelector('#komm');
  const slider = form.querySelector('#lon');
  const edit = document.querySelector('#lon-edit');
  const resultsContainer = document.querySelector('#resultat');

  // Populate municipality dropdown from constants
  populateMunicipalityDropdown(selectElement);

  // Apply URL parameters (e.g. ?manadslon=25000)
  applyUrlParameters(form);

  function syncFromSlider() {
    exactSalary = null;
    edit.value = formatInputValue(Number(slider.value));
    calculate(form, resultsContainer);
  }

  function syncFromEdit() {
    let val = parseSalary(edit.value);
    if (isNaN(val) || val < 0) val = 0;
    if (val > 100000) val = 100000;
    exactSalary = val;
    slider.value = Math.round(val / 1000) * 1000;
    edit.value = formatInputValue(val);
    calculate(form, resultsContainer);
  }

  slider.addEventListener('input', syncFromSlider);

  edit.addEventListener('change', syncFromEdit);
  edit.addEventListener('blur', syncFromEdit);

  // Debounced live update while typing (helps iOS Safari)
  let editTimer = null;
  edit.addEventListener('input', () => {
    clearTimeout(editTimer);
    editTimer = setTimeout(() => {
      let val = parseSalary(edit.value);
      if (!isNaN(val) && val >= 0) {
        if (val > 100000) val = 100000;
        exactSalary = val;
        slider.value = Math.round(val / 1000) * 1000;
        calculate(form, resultsContainer);
      }
    }, 400);
  });

  edit.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      clearTimeout(editTimer);
      syncFromEdit();
      edit.blur();
    }
  });

  // Prevent form submit
  form.addEventListener('submit', (event) => {
    event.preventDefault();
  });

  // Recalculate when municipality changes
  selectElement.addEventListener('change', syncFromSlider);

  // Initial sync + calculation
  edit.value = formatInputValue(Number(slider.value));
  calculate(form, resultsContainer);
}

document.addEventListener('DOMContentLoaded', init);
