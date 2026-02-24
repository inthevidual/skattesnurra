import { beräknaSkatteuppdelning } from './tax-engine.js?v=0.52';
import {
  fyllKommunväljare,
  fyllFörsamlingsväljare,
  fyllÅrsväljare,
  läsFormulärVärden,
  tillämpUrlParametrar,
  visaResultat,
  visaFelmeddelande,
  visaNollläge,
} from './ui.js?v=0.52';

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
}

document.addEventListener('DOMContentLoaded', initiera);
