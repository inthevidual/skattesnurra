import { beräknaSkatteuppdelning } from './tax-engine.js?v=0.9999';
import {
  fyllKommunväljare,
  fyllFörsamlingsväljare,
  fyllÅrsväljare,
  läsFormulärVärden,
  tillämpUrlParametrar,
  visaResultat,
  visaFelmeddelande,
  visaNollläge,
} from './ui.js?v=0.9999';
import { beräknaHistoriskSkatt } from './history-engine.js?v=0.9999';
import { visaHistorisktResultat, visaDecenniumKommentar } from './history-ui.js?v=0.9999';

/**
 * Kör skatteberäkningen och visa resultat.
 * @param {HTMLFormElement} form
 * @param {HTMLElement} resultatBehållare
 */
// När användaren skriver en exakt lön, spara den här så att den åsidosätter reglagets avrundade värde.
let exaktLön = null;

function beräkna(form, resultatBehållare) {
  const värden = läsFormulärVärden(form);
  if (exaktLön !== null) värden.månadslön = exaktLön;

  if (värden.månadslön == null || isNaN(värden.månadslön) || värden.månadslön < 0) {
    resultatBehållare.innerHTML = '';
    return;
  }

  if (värden.månadslön === 0) {
    visaNollläge(resultatBehållare);
    return;
  }

  const uppdelning = beräknaSkatteuppdelning(värden, värden.inkomstår);

  if (!uppdelning) {
    visaFelmeddelande(resultatBehållare, 'Skriv bara siffror utan mellanslag eller kommatecken.');
    return;
  }

  visaResultat(resultatBehållare, uppdelning);
}

/**
 * Formatera ett tal med smala blanksteg som tusentalsavgränsare för redigerbart fält.
 * Använder Unicode tunt blanksteg (inte HTML-entitet) eftersom det går in i ett input-värde.
 */
function formateraInmatning(n) {
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '\u2009');
}

/**
 * Tolka en lönesträng tillbaka till ett tal, ta bort alla blanksteg.
 */
function tolkLön(sträng) {
  return Number(sträng.replace(/\s/g, ''));
}

/** Tab-växling mellan Nutid och Historik */
function initieraTabs() {
  const tabNutid = document.querySelector('#tab-nutid');
  const tabHistorik = document.querySelector('#tab-historik');
  const panelNutid = document.querySelector('#panel-nutid');
  const panelHistorik = document.querySelector('#panel-historik');

  function aktivera(tab) {
    const isNutid = tab === tabNutid;
    tabNutid.setAttribute('aria-selected', String(isNutid));
    tabHistorik.setAttribute('aria-selected', String(!isNutid));
    if (isNutid) {
      panelNutid.removeAttribute('hidden');
      panelHistorik.setAttribute('hidden', '');
    } else {
      panelHistorik.removeAttribute('hidden');
      panelNutid.setAttribute('hidden', '');
    }
  }

  tabNutid.addEventListener('click', () => aktivera(tabNutid));
  tabHistorik.addEventListener('click', () => aktivera(tabHistorik));
}

/** Historik-flikens inmatning och beräkning */
function initieraHistorik() {
  const yearSlider = document.querySelector('#historik-year');
  const yearDisplay = document.querySelector('#historik-year-display');
  const incomeSlider = document.querySelector('#historik-lon');
  const incomeEdit = document.querySelector('#historik-lon-edit');
  const resultatContainer = document.querySelector('#historik-resultat');
  const commentaryContainer = document.querySelector('#historik-commentary');

  let exaktHistorikLön = null;

  function beräknaHistorik() {
    const year = Number(yearSlider.value);
    const månadslön = exaktHistorikLön !== null ? exaktHistorikLön : Number(incomeSlider.value);
    const årsinkomst = månadslön * 12;

    yearDisplay.textContent = year;

    if (månadslön <= 0) {
      resultatContainer.innerHTML = '<p class="text-gray-500">Ange en lön för att se beräkningen.</p>';
      visaDecenniumKommentar(commentaryContainer, year);
      return;
    }

    const resultat = beräknaHistoriskSkatt(årsinkomst, year);
    visaHistorisktResultat(resultatContainer, resultat);
    visaDecenniumKommentar(commentaryContainer, year);
  }

  function synkaFrånReglage() {
    exaktHistorikLön = null;
    incomeEdit.value = formateraInmatning(Number(incomeSlider.value));
    beräknaHistorik();
  }

  function synkaFrånInmatning() {
    let val = tolkLön(incomeEdit.value);
    if (isNaN(val) || val < 0) val = 0;
    if (val > 100000) val = 100000;
    exaktHistorikLön = val;
    incomeSlider.value = Math.round(val / 1000) * 1000;
    incomeEdit.value = formateraInmatning(val);
    beräknaHistorik();
  }

  yearSlider.addEventListener('input', () => {
    yearDisplay.textContent = yearSlider.value;
    beräknaHistorik();
  });

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
        exaktHistorikLön = val;
        incomeSlider.value = Math.round(val / 1000) * 1000;
        beräknaHistorik();
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

  // Initial synkronisering
  incomeEdit.value = formateraInmatning(Number(incomeSlider.value));
  beräknaHistorik();
}

function initiera() {
  const form = document.querySelector('#myForm');
  const selectElement = form.querySelector('#komm');
  const slider = form.querySelector('#lon');
  const edit = document.querySelector('#lon-edit');
  const resultatBehållare = document.querySelector('#resultat');
  const inkomstårSelect = document.querySelector('#inkomstar');

  // Fyll årsväljaren och kommunväljaren
  fyllÅrsväljare(inkomstårSelect);
  fyllKommunväljare(selectElement, Number(inkomstårSelect.value));

  // Tillämpa URL-parametrar (t.ex. ?manadslon=25000)
  tillämpUrlParametrar(form);

  function synkaFrånReglage() {
    exaktLön = null;
    edit.value = formateraInmatning(Number(slider.value));
    beräkna(form, resultatBehållare);
  }

  function synkaFrånInmatning() {
    let val = tolkLön(edit.value);
    if (isNaN(val) || val < 0) val = 0;
    if (val > 100000) val = 100000;
    exaktLön = val;
    slider.value = Math.round(val / 1000) * 1000;
    edit.value = formateraInmatning(val);
    beräkna(form, resultatBehållare);
  }

  slider.addEventListener('input', synkaFrånReglage);

  edit.addEventListener('change', synkaFrånInmatning);
  edit.addEventListener('blur', synkaFrånInmatning);

  // Fördröjd liveuppdatering medan användaren skriver (hjälper iOS Safari)
  let inmatningsTimer = null;
  edit.addEventListener('input', () => {
    clearTimeout(inmatningsTimer);
    inmatningsTimer = setTimeout(() => {
      let val = tolkLön(edit.value);
      if (!isNaN(val) && val >= 0) {
        if (val > 100000) val = 100000;
        exaktLön = val;
        slider.value = Math.round(val / 1000) * 1000;
        beräkna(form, resultatBehållare);
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

  // Förhindra formulärinskick
  form.addEventListener('submit', (event) => {
    event.preventDefault();
  });

  // Kyrkoavgift: checkbox + församlingsväljare
  const kyrkomedlem = document.querySelector('#kyrkomedlem');
  const församlingFieldset = document.querySelector('#forsamling-fieldset');
  const församlingSelect = document.querySelector('#forsamling');

  function hämtaKommunNamn() {
    return selectElement.options[selectElement.selectedIndex].text;
  }

  function harFörsamlingar() {
    return hämtaKommunNamn() !== 'Riksgenomsnitt';
  }

  function uppdateraFörsamlingsväljare() {
    if (harFörsamlingar()) {
      fyllFörsamlingsväljare(församlingSelect, hämtaKommunNamn(), Number(inkomstårSelect.value));
      församlingFieldset.classList.remove('hidden');
    } else {
      församlingFieldset.classList.add('hidden');
    }
  }

  kyrkomedlem.addEventListener('change', () => {
    if (kyrkomedlem.checked) {
      uppdateraFörsamlingsväljare();
    } else {
      församlingFieldset.classList.add('hidden');
    }
    beräkna(form, resultatBehållare);
  });

  församlingSelect.addEventListener('change', () => {
    beräkna(form, resultatBehållare);
  });

  // Räkna om när kommun ändras
  selectElement.addEventListener('change', () => {
    if (kyrkomedlem.checked) {
      uppdateraFörsamlingsväljare();
    }
    synkaFrånReglage();
  });

  // Byt inkomstår — fyll om kommun- och församlingsväljare
  inkomstårSelect.addEventListener('change', () => {
    const år = Number(inkomstårSelect.value);
    fyllKommunväljare(selectElement, år);
    if (kyrkomedlem.checked) {
      uppdateraFörsamlingsväljare();
    }
    synkaFrånReglage();
  });

  // Initial synkronisering + beräkning
  edit.value = formateraInmatning(Number(slider.value));
  beräkna(form, resultatBehållare);

  // Initialisera tabbar och historik
  initieraTabs();
  initieraHistorik();
}

document.addEventListener('DOMContentLoaded', initiera);
