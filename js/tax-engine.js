import {
  INKOMSTÅR_2026,
  GRUNDAVDRAG_INTERVALL,
  JOBBSKATTEAVDRAG_INTERVALL,
  KOMMUNER_MED_REGIONAL_SKATTEREDUKTION,
} from './constants.js';

/**
 * Hämta inkomstårkonfiguration. Enbart 2026 stöds.
 * @param {number} [inkomstår=2026]
 * @returns {object}
 */
function hämtaKonfig(inkomstår = 2026) {
  if (inkomstår !== 2026) {
    throw new Error(`Inkomstår ${inkomstår} stöds inte`);
  }
  return INKOMSTÅR_2026;
}

/**
 * Beräkna grundavdrag (basavdrag).
 * 5-stegs intervallsystem, resultat avrundat uppåt till närmaste 100.
 * @param {number} årsinkomst - Bruttoinkomst per år i SEK
 * @param {number} [inkomstår=2026]
 * @returns {number} Grundavdrag i SEK
 */
export function beräknaGrundavdrag(årsinkomst, inkomstår = 2026) {
  const konfig = hämtaKonfig(inkomstår);
  const { PBB } = konfig;

  if (årsinkomst <= 0) return 0;

  for (const intervall of GRUNDAVDRAG_INTERVALL) {
    const min = intervall.minPBB * PBB;
    const max = intervall.maxPBB * PBB;

    if (årsinkomst >= min && (årsinkomst < max || intervall.maxPBB === Infinity)) {
      if (intervall.koefficient !== undefined) {
        return Math.ceil((intervall.koefficient * PBB) / 100) * 100;
      }
      return Math.ceil((intervall.basKoefficient * PBB + intervall.inkomstKoefficient * årsinkomst) / 100) * 100;
    }
  }

  return 0;
}

/**
 * Beräkna jobbskatteavdrag.
 * 4-stegs intervallsystem.
 * @param {number} årsinkomst - Bruttoinkomst per år i SEK
 * @param {number} grundavdrag - Grundavdrag i SEK
 * @param {number} kommunalSkattesats - Kommunal skattesats som decimal (t.ex. 0.3238)
 * @param {number} [inkomstår=2026]
 * @returns {number} Jobbskatteavdrag i SEK
 */
export function beräknaJobbskatteavdrag(årsinkomst, grundavdrag, kommunalSkattesats, inkomstår = 2026) {
  const konfig = hämtaKonfig(inkomstår);
  const { PBB } = konfig;

  if (årsinkomst <= 0) return 0;

  let jsa = 0;

  if (årsinkomst < 0.91 * PBB) {
    // Nivå 1: linjär
    jsa = (årsinkomst - grundavdrag) * kommunalSkattesats;
    return Math.max(0, jsa);
  } else if (årsinkomst < 3.24 * PBB) {
    // Nivå 2
    jsa = (0.91 * PBB + 0.3874 * (årsinkomst - 0.91 * PBB) - grundavdrag) * kommunalSkattesats;
  } else if (årsinkomst < 8.08 * PBB) {
    // Nivå 3
    jsa = (1.813 * PBB + 0.251 * (årsinkomst - 3.24 * PBB) - grundavdrag) * kommunalSkattesats;
  } else {
    // Nivå 4: tak
    jsa = (3.027 * PBB - grundavdrag) * kommunalSkattesats;
  }

  return jsa;
}

/**
 * Beräkna kommunalskatt före jobbskatteavdrag.
 * @param {number} årsinkomst
 * @param {number} grundavdrag
 * @param {number} kommunalSkattesats - Som decimal (t.ex. 0.3238)
 * @returns {number} Kommunalskatt i SEK
 */
export function beräknaKommunalskatt(årsinkomst, grundavdrag, kommunalSkattesats) {
  return Math.max(0, Math.round((årsinkomst - grundavdrag) * kommunalSkattesats));
}

/**
 * Beräkna skattereduktion för förvärvsinkomst.
 * 3-stegs system med max 1500 SEK.
 * @param {number} årsinkomst
 * @param {number} grundavdrag
 * @param {number} [inkomstår=2026]
 * @returns {number} Reduktion i SEK
 */
export function beräknaSkattereduktionFörvärvsinkomst(årsinkomst, grundavdrag, inkomstår = 2026) {
  const konfig = hämtaKonfig(inkomstår);
  const { UNDRE, ÖVRE, SATS, MAX } = konfig.SKATTEREDUKTION_FÖRVÄRVSINKOMST;
  const beskattningsbarInkomst = årsinkomst - grundavdrag;

  if (beskattningsbarInkomst <= UNDRE) {
    return 0;
  } else if (beskattningsbarInkomst <= ÖVRE) {
    return SATS * (beskattningsbarInkomst - UNDRE);
  }
  return MAX;
}

/**
 * Beräkna statlig inkomstskatt.
 * 20% på inkomst över brytpunkt.
 * @param {number} årsinkomst
 * @param {number} [inkomstår=2026]
 * @returns {{ belopp: number, marginalsats: number }}
 */
export function beräknaStatligSkatt(årsinkomst, inkomstår = 2026) {
  const konfig = hämtaKonfig(inkomstår);
  const { BRYTPUNKT, STATLIG_SKATTESATS } = konfig;

  if (årsinkomst > BRYTPUNKT) {
    return {
      belopp: (årsinkomst - BRYTPUNKT) * STATLIG_SKATTESATS,
      marginalsats: STATLIG_SKATTESATS,
    };
  }
  return { belopp: 0, marginalsats: 0 };
}

/**
 * Beräkna begravningsavgift.
 * Stockholm har en särskild lägre avgift.
 * @param {number} årsinkomst
 * @param {number} grundavdrag
 * @param {string} kommunNamn
 * @param {number} [inkomstår=2026]
 * @returns {number} Begravningsavgift i SEK
 */
export function beräknaBegravningsavgift(årsinkomst, grundavdrag, kommunNamn, inkomstår = 2026) {
  const konfig = hämtaKonfig(inkomstår);
  const sats = kommunNamn === 'Stockholm'
    ? konfig.BEGRAVNINGSAVGIFT_STOCKHOLM
    : konfig.BEGRAVNINGSAVGIFT_STANDARD;
  return Math.max(0, (årsinkomst - grundavdrag) * sats);
}

/**
 * Beräkna allmän pensionsavgift.
 * Komplex avrundning: golv inkomst till 100, beräkna 7%, avrunda till 100,
 * sedan offset mot inkomstskatt (om pension > skatt, pension = pension - skatt, annars 0).
 * @param {number} årsinkomst
 * @param {number} inkomstskatt - Beräknad inkomstskatt före pensionsoffset
 * @param {number} [inkomstår=2026]
 * @returns {number} Pensionsavgift i SEK
 */
export function beräknaPensionsavgift(årsinkomst, inkomstskatt, inkomstår = 2026) {
  const konfig = hämtaKonfig(inkomstår);
  const { PBB, PENSIONSAVGIFT } = konfig;
  const minInkomst = Math.ceil((0.423 * PBB) / 100) * 100;

  if (årsinkomst < minInkomst) return 0;

  const pension = Math.round((PENSIONSAVGIFT * Math.floor(årsinkomst / 100) * 100) / 100) * 100;

  if (pension < inkomstskatt) return 0;
  return pension - inkomstskatt;
}

/**
 * Beräkna public service-avgift.
 * Max 1184 SEK för inkomst över 1.42 * IBB-tröskel.
 * @param {number} årsinkomst
 * @param {number} grundavdrag
 * @param {number} [inkomstår=2026]
 * @returns {number} Public service-avgift i SEK
 */
export function beräknaPublicServiceAvgift(årsinkomst, grundavdrag, inkomstår = 2026) {
  const konfig = hämtaKonfig(inkomstår);
  const { IBB, PUBLIC_SERVICE_AVGIFT, PUBLIC_SERVICE_MAX, PUBLIC_SERVICE_TRÖSKELMULTIPLIKATOR } = konfig;
  const beskattningsbarInkomst = årsinkomst - grundavdrag;

  if (beskattningsbarInkomst <= 0) return 0;

  if (beskattningsbarInkomst <= PUBLIC_SERVICE_TRÖSKELMULTIPLIKATOR * IBB) {
    return Math.max(0, PUBLIC_SERVICE_AVGIFT * beskattningsbarInkomst);
  }
  return PUBLIC_SERVICE_MAX;
}

/**
 * Kontrollera om en kommun kvalificerar för regional skattereduktion.
 * @param {string} kommunNamn
 * @returns {boolean}
 */
export function harRegionalSkattereduktion(kommunNamn) {
  return KOMMUNER_MED_REGIONAL_SKATTEREDUKTION.has(kommunNamn);
}

/**
 * Beräkna fullständig skatteuppdelning för given inkomst och kommun.
 * Huvudfunktionen som ersätter ursprunglig `raknaut()`.
 *
 * @param {object} indata
 * @param {number} indata.månadslön - Månadslön i SEK
 * @param {number} indata.kommunalSkattesats - Kommunal skattesats i procent (t.ex. 32.38)
 * @param {string} indata.kommunNamn - Kommunnamn
 * @param {number} [inkomstår=2026]
 * @returns {object} Fullständig skatteuppdelning med alla komponenter
 */
export function beräknaSkatteuppdelning(indata, inkomstår = 2026) {
  const konfig = hämtaKonfig(inkomstår);
  const { AGA, VIKTAD_MOMS, REGIONAL_SKATTEREDUKTION_BELOPP } = konfig;

  const årsinkomst = indata.månadslön * 12;
  const kommunalSkattesats = indata.kommunalSkattesats / 100;

  if (årsinkomst <= 0) {
    return null;
  }

  const grundavdrag = beräknaGrundavdrag(årsinkomst, inkomstår);
  const jobbskatteavdrag = beräknaJobbskatteavdrag(årsinkomst, grundavdrag, kommunalSkattesats, inkomstår);
  const kommunalskatt = beräknaKommunalskatt(årsinkomst, grundavdrag, kommunalSkattesats);
  const skattereduktionFörvärvsinkomst = beräknaSkattereduktionFörvärvsinkomst(årsinkomst, grundavdrag, inkomstår);
  const statligSkatt = beräknaStatligSkatt(årsinkomst, inkomstår);
  const begravningsavgift = beräknaBegravningsavgift(årsinkomst, grundavdrag, indata.kommunNamn, inkomstår);
  const publicServiceAvgift = beräknaPublicServiceAvgift(årsinkomst, grundavdrag, inkomstår);

  // Regional reduktion: beräknas synkront (fixar ursprunglig localStorage-bugg)
  const harRegional = harRegionalSkattereduktion(indata.kommunNamn);
  const regionalReduktion = harRegional ? REGIONAL_SKATTEREDUKTION_BELOPP : 0;

  // Inkomstskatt: kommunalskatt - JSA - skattereduktion förvärvsinkomst + statlig skatt
  const inkomstskatt = Math.max(0, Math.round(kommunalskatt - jobbskatteavdrag - skattereduktionFörvärvsinkomst + statligSkatt.belopp));

  // Pensionsavgift (beror på inkomstskatt)
  const pensionsavgift = beräknaPensionsavgift(årsinkomst, inkomstskatt, inkomstår);

  // Nettoinkomst efter skatt
  const nettoÅrsinkomst = Math.round(
    årsinkomst - inkomstskatt - pensionsavgift - begravningsavgift - publicServiceAvgift + regionalReduktion
  );

  // Arbetsgivarkostnader
  const arbetsgivaravgift = årsinkomst * AGA;
  const totalArbetsgivarkostnad = årsinkomst + arbetsgivaravgift;

  // Moms och total skatt
  const moms = VIKTAD_MOMS * nettoÅrsinkomst;

  // Marginalskatt
  const marginalStatligSkattesats = statligSkatt.marginalsats;
  const totalMarginalskatt =
    (marginalStatligSkattesats + (1 - marginalStatligSkattesats) * VIKTAD_MOMS + AGA) / (1 + AGA);

  // Total skattebörda
  const totalSkatt = moms + arbetsgivaravgift + inkomstskatt + pensionsavgift + begravningsavgift + publicServiceAvgift - regionalReduktion;
  const genomsnittligSkattesats = totalSkatt / totalArbetsgivarkostnad;

  return {
    årsinkomst,
    grundavdrag,
    jobbskatteavdrag,
    kommunalskatt,
    skattereduktionFörvärvsinkomst,
    statligSkatt: statligSkatt.belopp,
    begravningsavgift,
    pensionsavgift,
    publicServiceAvgift,
    regionalReduktion,
    inkomstskatt,
    nettoÅrsinkomst,
    arbetsgivaravgift,
    totalArbetsgivarkostnad,
    moms,
    totalMarginalskatt,
    totalSkatt,
    genomsnittligSkattesats,
  };
}
