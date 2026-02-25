import { INKOMSTÅR, STANDARD_INKOMSTÅR } from './constants.js?v=0.99';

/**
 * Hämta inkomstårkonfiguration.
 * @param {number} [inkomstår]
 * @returns {object}
 */
function hämtaKonfig(inkomstår = STANDARD_INKOMSTÅR) {
  const konfig = INKOMSTÅR[inkomstår];
  if (!konfig) {
    throw new Error(`Inkomstår ${inkomstår} stöds inte`);
  }
  return konfig;
}

/**
 * Beräkna grundavdrag (basavdrag).
 * 5-stegs intervallsystem, resultat avrundat uppåt till närmaste 100.
 * @param {number} årsinkomst - Bruttoinkomst per år i SEK
 * @param {number} [inkomstår]
 * @returns {number} Grundavdrag i SEK
 */
export function beräknaGrundavdrag(årsinkomst, inkomstår = STANDARD_INKOMSTÅR) {
  const konfig = hämtaKonfig(inkomstår);
  const { PBB } = konfig;

  if (årsinkomst <= 0) return 0;

  for (const intervall of konfig.grundavdragIntervall) {
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
 * 4-stegs intervallsystem, med parametrar från årskonfigurationen.
 * @param {number} årsinkomst - Bruttoinkomst per år i SEK
 * @param {number} grundavdrag - Grundavdrag i SEK
 * @param {number} kommunalSkattesats - Kommunal skattesats som decimal (t.ex. 0.3238)
 * @param {number} [inkomstår]
 * @returns {number} Jobbskatteavdrag i SEK
 */
export function beräknaJobbskatteavdrag(årsinkomst, grundavdrag, kommunalSkattesats, inkomstår = STANDARD_INKOMSTÅR) {
  const konfig = hämtaKonfig(inkomstår);
  const { PBB } = konfig;
  const intervaller = konfig.jobbskatteavdragIntervall;

  if (årsinkomst <= 0) return 0;

  const nivå1 = intervaller[0];
  const nivå2 = intervaller[1];
  const nivå3 = intervaller[2];
  const nivå4 = intervaller[3];

  let jsa = 0;

  if (årsinkomst < nivå1.maxPBB * PBB) {
    // Nivå 1: linjär
    jsa = (årsinkomst - grundavdrag) * kommunalSkattesats;
    return Math.max(0, jsa);
  } else if (årsinkomst < nivå2.maxPBB * PBB) {
    // Nivå 2
    jsa = (nivå2.basMultiplikator * PBB + nivå2.lutning * (årsinkomst - nivå2.basMultiplikator * PBB) - grundavdrag) * kommunalSkattesats;
  } else if (årsinkomst < nivå3.maxPBB * PBB) {
    // Nivå 3
    jsa = (nivå3.basPBB * PBB + nivå3.lutning * (årsinkomst - nivå3.undrePBB * PBB) - grundavdrag) * kommunalSkattesats;
  } else {
    // Nivå 4: tak
    jsa = (nivå4.takPBB * PBB - grundavdrag) * kommunalSkattesats;
  }

  // Avtrappning (phase-out) for years that have it (2023-2024)
  if (konfig.JSA_AVTRAPPNING && årsinkomst > konfig.JSA_AVTRAPPNING.tröskelPBB * PBB) {
    jsa -= konfig.JSA_AVTRAPPNING.sats * (årsinkomst - konfig.JSA_AVTRAPPNING.tröskelPBB * PBB);
    jsa = Math.max(0, jsa);
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
 * @param {number} [inkomstår]
 * @returns {number} Reduktion i SEK
 */
export function beräknaSkattereduktionFörvärvsinkomst(årsinkomst, grundavdrag, inkomstår = STANDARD_INKOMSTÅR) {
  const konfig = hämtaKonfig(inkomstår);
  if (!konfig.SKATTEREDUKTION_FÖRVÄRVSINKOMST) return 0;
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
 * 20% på inkomst över brytpunkt, plus eventuell varnskatt (2018-2019).
 * @param {number} årsinkomst
 * @param {number} [inkomstår]
 * @returns {{ belopp: number, marginalsats: number }}
 */
export function beräknaStatligSkatt(årsinkomst, inkomstår = STANDARD_INKOMSTÅR) {
  const konfig = hämtaKonfig(inkomstår);
  const { BRYTPUNKT, STATLIG_SKATTESATS } = konfig;

  let belopp = 0;
  let marginalsats = 0;

  if (årsinkomst > BRYTPUNKT) {
    belopp = (årsinkomst - BRYTPUNKT) * STATLIG_SKATTESATS;
    marginalsats = STATLIG_SKATTESATS;
  }

  // Varnskatt (2018-2019): extra 5% ovanför andra brytpunkten
  if (konfig.VARNSKATT && årsinkomst > konfig.VARNSKATT.BRYTPUNKT) {
    belopp += (årsinkomst - konfig.VARNSKATT.BRYTPUNKT) * konfig.VARNSKATT.SKATTESATS;
    marginalsats += konfig.VARNSKATT.SKATTESATS;
  }

  return { belopp, marginalsats };
}

/**
 * Beräkna begravningsavgift.
 * Stockholm och Tranås har egna huvudmän och sätter egna avgifter.
 * @param {number} årsinkomst
 * @param {number} grundavdrag
 * @param {string} kommunNamn
 * @param {number} [inkomstår]
 * @returns {number} Begravningsavgift i SEK
 */
export function beräknaBegravningsavgift(årsinkomst, grundavdrag, kommunNamn, inkomstår = STANDARD_INKOMSTÅR) {
  const konfig = hämtaKonfig(inkomstår);
  let sats = konfig.BEGRAVNINGSAVGIFT_STANDARD;
  if (kommunNamn === 'Stockholm') sats = konfig.BEGRAVNINGSAVGIFT_STOCKHOLM;
  else if (kommunNamn === 'Tranås') sats = konfig.BEGRAVNINGSAVGIFT_TRANÅS;
  return Math.max(0, (årsinkomst - grundavdrag) * sats);
}

/**
 * Beräkna allmän pensionsavgift.
 * Komplex avrundning: golv inkomst till 100, beräkna 7%, avrunda till 100,
 * sedan offset mot inkomstskatt (om pension > skatt, pension = pension - skatt, annars 0).
 * @param {number} årsinkomst
 * @param {number} inkomstskatt - Beräknad inkomstskatt före pensionsoffset
 * @param {number} [inkomstår]
 * @returns {number} Pensionsavgift i SEK
 */
export function beräknaPensionsavgift(årsinkomst, inkomstskatt, inkomstår = STANDARD_INKOMSTÅR) {
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
 * @param {number} årsinkomst
 * @param {number} grundavdrag
 * @param {number} [inkomstår]
 * @returns {number} Public service-avgift i SEK
 */
export function beräknaPublicServiceAvgift(årsinkomst, grundavdrag, inkomstår = STANDARD_INKOMSTÅR) {
  const konfig = hämtaKonfig(inkomstår);
  if (!konfig.PUBLIC_SERVICE_AVGIFT) return 0;
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
 * @param {number} [inkomstår]
 * @returns {boolean}
 */
export function harRegionalSkattereduktion(kommunNamn, inkomstår = STANDARD_INKOMSTÅR) {
  const konfig = hämtaKonfig(inkomstår);
  if (!konfig.kommunerMedRegionalSkattereduktion) return false;
  return konfig.kommunerMedRegionalSkattereduktion.includes(kommunNamn);
}

/**
 * Beräkna tillfälligt jobbskatteavdrag (2021-2022).
 * Infasning 60 000–240 000, max 2 250, utfasning 300 000–500 000.
 * @param {number} årsinkomst
 * @param {number} [inkomstår]
 * @returns {number} Tillfälligt jobbskatteavdrag i SEK
 */
export function beräknaTillfälligtJobbskatteavdrag(årsinkomst, inkomstår = STANDARD_INKOMSTÅR) {
  const konfig = hämtaKonfig(inkomstår);
  if (!konfig.TILLFÄLLIGT_JOBBSKATTEAVDRAG) return 0;
  const { infasning, max, utfasning } = konfig.TILLFÄLLIGT_JOBBSKATTEAVDRAG;

  if (årsinkomst <= infasning.undre) return 0;
  if (årsinkomst <= infasning.övre) return infasning.sats * (årsinkomst - infasning.undre);
  if (årsinkomst <= utfasning.undre) return max;
  if (årsinkomst <= utfasning.övre) return max - utfasning.sats * (årsinkomst - utfasning.undre);
  return 0;
}

/**
 * Beräkna kyrkoavgift.
 * @param {number} årsinkomst
 * @param {number} grundavdrag
 * @param {number} kyrkoavgiftSats - Som decimal (t.ex. 0.0086)
 * @returns {number} Kyrkoavgift i SEK
 */
export function beräknaKyrkoavgift(årsinkomst, grundavdrag, kyrkoavgiftSats) {
  return Math.max(0, (årsinkomst - grundavdrag) * kyrkoavgiftSats);
}

/**
 * Beräkna fullständig skatteuppdelning för given inkomst och kommun.
 * Huvudfunktionen som ersätter ursprunglig `raknaut()`.
 *
 * @param {object} indata
 * @param {number} indata.månadslön - Månadslön i SEK
 * @param {number} indata.kommunalSkattesats - Kommunal skattesats i procent (t.ex. 32.38)
 * @param {string} indata.kommunNamn - Kommunnamn
 * @param {number} [indata.kyrkoavgiftSats] - Kyrkoavgift i procent (t.ex. 0.86), 0 om ej medlem
 * @param {number} [inkomstår]
 * @returns {object} Fullständig skatteuppdelning med alla komponenter
 */
export function beräknaSkatteuppdelning(indata, inkomstår = STANDARD_INKOMSTÅR) {
  const konfig = hämtaKonfig(inkomstår);
  const { AGA, VIKTAD_MOMS } = konfig;
  const REGIONAL_SKATTEREDUKTION_BELOPP = konfig.REGIONAL_SKATTEREDUKTION_BELOPP || 0;

  const årsinkomst = indata.månadslön * 12;
  const kommunalSkattesats = indata.kommunalSkattesats / 100;

  if (årsinkomst <= 0) {
    return null;
  }

  const grundavdrag = beräknaGrundavdrag(årsinkomst, inkomstår);
  const jobbskatteavdrag = beräknaJobbskatteavdrag(årsinkomst, grundavdrag, kommunalSkattesats, inkomstår);
  const tillfälligtJobbskatteavdrag = beräknaTillfälligtJobbskatteavdrag(årsinkomst, inkomstår);
  const kommunalskatt = beräknaKommunalskatt(årsinkomst, grundavdrag, kommunalSkattesats);
  const skattereduktionFörvärvsinkomst = beräknaSkattereduktionFörvärvsinkomst(årsinkomst, grundavdrag, inkomstår);
  const statligSkatt = beräknaStatligSkatt(årsinkomst, inkomstår);
  const begravningsavgift = beräknaBegravningsavgift(årsinkomst, grundavdrag, indata.kommunNamn, inkomstår);
  const kyrkoavgift = indata.kyrkoavgiftSats
    ? beräknaKyrkoavgift(årsinkomst, grundavdrag, indata.kyrkoavgiftSats / 100)
    : 0;
  const publicServiceAvgift = beräknaPublicServiceAvgift(årsinkomst, grundavdrag, inkomstår);

  // Regional reduktion
  const harRegional = harRegionalSkattereduktion(indata.kommunNamn, inkomstår);
  const regionalReduktion = harRegional ? REGIONAL_SKATTEREDUKTION_BELOPP : 0;

  // Inkomstskatt: kommunalskatt - JSA - tillfälligt JSA - skattereduktion förvärvsinkomst + statlig skatt
  const inkomstskatt = Math.max(0, Math.round(kommunalskatt - jobbskatteavdrag - tillfälligtJobbskatteavdrag - skattereduktionFörvärvsinkomst + statligSkatt.belopp));

  // Pensionsavgift (beror på inkomstskatt)
  const pensionsavgift = beräknaPensionsavgift(årsinkomst, inkomstskatt, inkomstår);

  // Nettoinkomst efter skatt
  const nettoÅrsinkomst = Math.round(
    årsinkomst - inkomstskatt - pensionsavgift - begravningsavgift - kyrkoavgift - publicServiceAvgift + regionalReduktion
  );

  // Arbetsgivarkostnader
  const arbetsgivaravgift = årsinkomst * AGA;
  const totalArbetsgivarkostnad = årsinkomst + arbetsgivaravgift;

  // Moms och total skatt
  const moms = VIKTAD_MOMS * nettoÅrsinkomst;

  // Marginalskatt
  const marginalStatligSkattesats = statligSkatt.marginalsats;
  const jsaAvtrappningSats = (konfig.JSA_AVTRAPPNING && årsinkomst > konfig.JSA_AVTRAPPNING.tröskelPBB * konfig.PBB) ? konfig.JSA_AVTRAPPNING.sats : 0;
  const totalMarginalskatt =
    (marginalStatligSkattesats + jsaAvtrappningSats + (1 - marginalStatligSkattesats - jsaAvtrappningSats) * VIKTAD_MOMS + AGA) / (1 + AGA);

  // Total skattebörda
  const totalSkatt = moms + arbetsgivaravgift + inkomstskatt + pensionsavgift + begravningsavgift + kyrkoavgift + publicServiceAvgift - regionalReduktion;
  const genomsnittligSkattesats = totalSkatt / totalArbetsgivarkostnad;

  return {
    årsinkomst,
    grundavdrag,
    jobbskatteavdrag,
    tillfälligtJobbskatteavdrag,
    kommunalskatt,
    skattereduktionFörvärvsinkomst,
    statligSkatt: statligSkatt.belopp,
    begravningsavgift,
    kyrkoavgift,
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
