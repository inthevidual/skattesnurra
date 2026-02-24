#!/usr/bin/env node
// Generera data/YYYY.js-filer för historiska inkomstår 2018-2022.
// Läser konstantvärden härifrån och kommun/församlingsdata från
// gamladata/församlingar-YYYY.json.
//
// Användning: node scripts/generate-historical-data.js

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

// === Årskonstanter (från raknaskatt-filer + Skatteverket/SCB) ===

const YEARS = {
  2018: {
    PBB: 45500,
    IBB: 62500,
    AGA: 0.3142,
    BEGRAVNINGSAVGIFT_STANDARD: 0.00242,
    BEGRAVNINGSAVGIFT_STOCKHOLM: 0.00075,
    KYRKOAVGIFT_RIKSGENOMSNITT: 1.21,
    STATLIG_SKATTESATS: 0.20,
    BRYTPUNKT: 468700,
    VARNSKATT: { BRYTPUNKT: 675700, SKATTESATS: 0.05 },
    PENSIONSAVGIFT: 0.07,
    VIKTAD_MOMS: 0.19,
    STOCKHOLMS_SKATTESATS: 0.2998,
    RIKSGENOMSNITT: 32.12,
    grundavdragIntervall: [
      { minPBB: 0, maxPBB: 0.99, koefficient: 0.423 },
      { minPBB: 0.99, maxPBB: 2.72, basKoefficient: 0.225, inkomstKoefficient: 0.2 },
      { minPBB: 2.72, maxPBB: 3.11, koefficient: 0.770 },
      { minPBB: 3.11, maxPBB: 7.88, basKoefficient: 1.081, inkomstKoefficient: -0.1 },
      { minPBB: 7.88, maxPBB: 'Infinity', koefficient: 0.293 },
    ],
    JSA_AVTRAPPNING: { tröskelPBB: 13.54, sats: 0.03 },
    jobbskatteavdragIntervall: [
      { minPBB: 0, maxPBB: 0.91, typ: 'linjär' },
      { minPBB: 0.91, maxPBB: 2.94, basMultiplikator: 0.91, lutning: 0.332 },
      { minPBB: 2.94, maxPBB: 8.08, basPBB: 1.584, undrePBB: 2.94, lutning: 0.111 },
      { minPBB: 8.08, maxPBB: 'Infinity', takPBB: 2.155 },
    ],
    comment: 'Varnskatt (5% ovanför andra brytpunkten)',
  },

  2019: {
    PBB: 46500,
    IBB: 64400,
    AGA: 0.3142,
    BEGRAVNINGSAVGIFT_STANDARD: 0.00253,
    BEGRAVNINGSAVGIFT_STOCKHOLM: 0.00065,
    KYRKOAVGIFT_RIKSGENOMSNITT: 1.21,
    STATLIG_SKATTESATS: 0.20,
    BRYTPUNKT: 504400,
    VARNSKATT: { BRYTPUNKT: 703000, SKATTESATS: 0.05 },
    PENSIONSAVGIFT: 0.07,
    VIKTAD_MOMS: 0.19,
    PUBLIC_SERVICE_AVGIFT: 0.01,
    PUBLIC_SERVICE_MAX: 1347,
    PUBLIC_SERVICE_TRÖSKELMULTIPLIKATOR: 2.092,
    STOCKHOLMS_SKATTESATS: 0.2982,
    RIKSGENOMSNITT: 32.19,
    grundavdragIntervall: [
      { minPBB: 0, maxPBB: 0.99, koefficient: 0.423 },
      { minPBB: 0.99, maxPBB: 2.72, basKoefficient: 0.225, inkomstKoefficient: 0.2 },
      { minPBB: 2.72, maxPBB: 3.11, koefficient: 0.770 },
      { minPBB: 3.11, maxPBB: 7.88, basKoefficient: 1.081, inkomstKoefficient: -0.1 },
      { minPBB: 7.88, maxPBB: 'Infinity', koefficient: 0.293 },
    ],
    JSA_AVTRAPPNING: { tröskelPBB: 13.54, sats: 0.03 },
    jobbskatteavdragIntervall: [
      { minPBB: 0, maxPBB: 0.91, typ: 'linjär' },
      { minPBB: 0.91, maxPBB: 3.24, basMultiplikator: 0.91, lutning: 0.3405 },
      { minPBB: 3.24, maxPBB: 8.08, basPBB: 1.703, undrePBB: 3.24, lutning: 0.128 },
      { minPBB: 8.08, maxPBB: 'Infinity', takPBB: 2.323 },
    ],
    comment: 'Första året med public service-avgift. Varnskatt (sista året).',
  },

  2020: {
    PBB: 47300,
    IBB: 66800,
    AGA: 0.3142,
    BEGRAVNINGSAVGIFT_STANDARD: 0.00250,
    BEGRAVNINGSAVGIFT_STOCKHOLM: 0.00065,
    KYRKOAVGIFT_RIKSGENOMSNITT: 1.21,
    STATLIG_SKATTESATS: 0.20,
    BRYTPUNKT: 523200,
    PENSIONSAVGIFT: 0.07,
    VIKTAD_MOMS: 0.19,
    PUBLIC_SERVICE_AVGIFT: 0.01,
    PUBLIC_SERVICE_MAX: 1397,
    PUBLIC_SERVICE_TRÖSKELMULTIPLIKATOR: 2.092,
    STOCKHOLMS_SKATTESATS: 0.2982,
    RIKSGENOMSNITT: 32.28,
    grundavdragIntervall: [
      { minPBB: 0, maxPBB: 0.99, koefficient: 0.423 },
      { minPBB: 0.99, maxPBB: 2.72, basKoefficient: 0.225, inkomstKoefficient: 0.2 },
      { minPBB: 2.72, maxPBB: 3.11, koefficient: 0.770 },
      { minPBB: 3.11, maxPBB: 7.88, basKoefficient: 1.081, inkomstKoefficient: -0.1 },
      { minPBB: 7.88, maxPBB: 'Infinity', koefficient: 0.293 },
    ],
    JSA_AVTRAPPNING: { tröskelPBB: 13.54, sats: 0.03 },
    jobbskatteavdragIntervall: [
      { minPBB: 0, maxPBB: 0.91, typ: 'linjär' },
      { minPBB: 0.91, maxPBB: 3.24, basMultiplikator: 0.91, lutning: 0.3405 },
      { minPBB: 3.24, maxPBB: 8.08, basPBB: 1.703, undrePBB: 3.24, lutning: 0.128 },
      { minPBB: 8.08, maxPBB: 'Infinity', takPBB: 2.323 },
    ],
    comment: 'Varnskatt avskaffad.',
  },

  2021: {
    PBB: 47600,
    IBB: 68200,
    AGA: 0.3142,
    BEGRAVNINGSAVGIFT_STANDARD: 0.00253,
    BEGRAVNINGSAVGIFT_STOCKHOLM: 0.00065,
    KYRKOAVGIFT_RIKSGENOMSNITT: 1.22,
    STATLIG_SKATTESATS: 0.20,
    BRYTPUNKT: 537200,
    PENSIONSAVGIFT: 0.07,
    VIKTAD_MOMS: 0.19,
    PUBLIC_SERVICE_AVGIFT: 0.01,
    PUBLIC_SERVICE_MAX: 1330,
    PUBLIC_SERVICE_TRÖSKELMULTIPLIKATOR: 1.95,
    SKATTEREDUKTION_FÖRVÄRVSINKOMST: { UNDRE: 40000, ÖVRE: 240000, SATS: 0.0075, MAX: 1500 },
    TILLFÄLLIGT_JOBBSKATTEAVDRAG: {
      infasning: { undre: 60000, övre: 240000, sats: 0.0125 },
      max: 2250,
      utfasning: { undre: 300000, övre: 500000, sats: 0.01125 },
    },
    STOCKHOLMS_SKATTESATS: 0.2982,
    RIKSGENOMSNITT: 32.27,
    grundavdragIntervall: [
      { minPBB: 0, maxPBB: 0.99, koefficient: 0.423 },
      { minPBB: 0.99, maxPBB: 2.72, basKoefficient: 0.225, inkomstKoefficient: 0.2 },
      { minPBB: 2.72, maxPBB: 3.11, koefficient: 0.770 },
      { minPBB: 3.11, maxPBB: 7.88, basKoefficient: 1.081, inkomstKoefficient: -0.1 },
      { minPBB: 7.88, maxPBB: 'Infinity', koefficient: 0.293 },
    ],
    JSA_AVTRAPPNING: { tröskelPBB: 13.54, sats: 0.03 },
    jobbskatteavdragIntervall: [
      { minPBB: 0, maxPBB: 0.91, typ: 'linjär' },
      { minPBB: 0.91, maxPBB: 3.24, basMultiplikator: 0.91, lutning: 0.3405 },
      { minPBB: 3.24, maxPBB: 8.08, basPBB: 1.703, undrePBB: 3.24, lutning: 0.128 },
      { minPBB: 8.08, maxPBB: 'Infinity', takPBB: 2.323 },
    ],
    comment: 'Skattereduktion för förvärvsinkomst och tillfälligt jobbskatteavdrag införs.',
  },

  2022: {
    PBB: 48300,
    IBB: 71000,
    AGA: 0.3142,
    BEGRAVNINGSAVGIFT_STANDARD: 0.00261,
    BEGRAVNINGSAVGIFT_STOCKHOLM: 0.00065,
    KYRKOAVGIFT_RIKSGENOMSNITT: 1.22,
    STATLIG_SKATTESATS: 0.20,
    BRYTPUNKT: 554900,
    PENSIONSAVGIFT: 0.07,
    VIKTAD_MOMS: 0.19,
    PUBLIC_SERVICE_AVGIFT: 0.01,
    PUBLIC_SERVICE_MAX: 1328,
    PUBLIC_SERVICE_TRÖSKELMULTIPLIKATOR: 1.87,
    SKATTEREDUKTION_FÖRVÄRVSINKOMST: { UNDRE: 40000, ÖVRE: 240000, SATS: 0.0075, MAX: 1500 },
    TILLFÄLLIGT_JOBBSKATTEAVDRAG: {
      infasning: { undre: 60000, övre: 240000, sats: 0.0125 },
      max: 2250,
      utfasning: { undre: 300000, övre: 500000, sats: 0.01125 },
    },
    STOCKHOLMS_SKATTESATS: 0.2982,
    RIKSGENOMSNITT: 32.24,
    grundavdragIntervall: [
      { minPBB: 0, maxPBB: 0.99, koefficient: 0.423 },
      { minPBB: 0.99, maxPBB: 2.72, basKoefficient: 0.225, inkomstKoefficient: 0.2 },
      { minPBB: 2.72, maxPBB: 3.11, koefficient: 0.770 },
      { minPBB: 3.11, maxPBB: 7.88, basKoefficient: 1.081, inkomstKoefficient: -0.1 },
      { minPBB: 7.88, maxPBB: 'Infinity', koefficient: 0.293 },
    ],
    JSA_AVTRAPPNING: { tröskelPBB: 13.54, sats: 0.03 },
    jobbskatteavdragIntervall: [
      { minPBB: 0, maxPBB: 0.91, typ: 'linjär' },
      { minPBB: 0.91, maxPBB: 3.24, basMultiplikator: 0.91, lutning: 0.3874 },
      { minPBB: 3.24, maxPBB: 8.08, basPBB: 1.813, undrePBB: 3.24, lutning: 0.128 },
      { minPBB: 8.08, maxPBB: 'Infinity', takPBB: 2.432 },
    ],
    comment: 'Höjt jobbskatteavdrag (nya lutningar). Sista året med tillfälligt JSA.',
  },
};

// === Hjälpfunktioner ===

function escapeStr(s) {
  return s.replace(/'/g, "\\'");
}

function formatNum(v) {
  // Preserve trailing zeros for consistency with existing data files
  if (v === 0.77 || v === 0.770) return '0.770';
  return String(v);
}

function formatIntervall(intervall) {
  const parts = [];
  for (const [k, v] of Object.entries(intervall)) {
    if (v === 'Infinity') {
      parts.push(`${k}: Infinity`);
    } else if (typeof v === 'string') {
      parts.push(`${k}: '${v}'`);
    } else {
      parts.push(`${k}: ${formatNum(v)}`);
    }
  }
  return `{ ${parts.join(', ')} }`;
}

function generateFile(år) {
  const c = YEARS[år];
  const jsonPath = join(ROOT, 'gamladata', `församlingar-${år}.json`);
  const jsonData = JSON.parse(readFileSync(jsonPath, 'utf-8'));

  const lines = [];
  const push = (s = '') => lines.push(s);

  push(`// Skattekonstanter för inkomståret ${år}`);
  push('// (c) Jacob Lundberg 2013-2022, uppdatering Erik Bengtzboe 2024-2026');
  if (c.comment) push(`// ${c.comment}`);
  push('');
  push('export default {');
  push('  // Basbelopp');
  push(`  PBB: ${c.PBB},`);
  push(`  IBB: ${c.IBB},`);
  push('');
  push('  // Arbetsgivaravgift');
  push(`  AGA: ${c.AGA},`);
  push('');
  push('  // Begravningsavgift');
  push(`  BEGRAVNINGSAVGIFT_STANDARD: ${c.BEGRAVNINGSAVGIFT_STANDARD},`);
  push(`  BEGRAVNINGSAVGIFT_STOCKHOLM: ${c.BEGRAVNINGSAVGIFT_STOCKHOLM},`);
  push('');
  push('  // Kyrkoavgift riksgenomsnitt (snitt av alla församlingar)');
  push(`  KYRKOAVGIFT_RIKSGENOMSNITT: ${c.KYRKOAVGIFT_RIKSGENOMSNITT},`);
  push('');
  push('  // Statlig skatt');
  push(`  STATLIG_SKATTESATS: ${c.STATLIG_SKATTESATS.toFixed(2)},`);
  push(`  BRYTPUNKT: ${c.BRYTPUNKT},`);
  if (c.VARNSKATT) {
    push('');
    push('  // Varnskatt (avskaffad fr.o.m. 2020)');
    push(`  VARNSKATT: { BRYTPUNKT: ${c.VARNSKATT.BRYTPUNKT}, SKATTESATS: ${c.VARNSKATT.SKATTESATS} },`);
  }
  push('');
  push('  // Pensionsavgift');
  push(`  PENSIONSAVGIFT: ${c.PENSIONSAVGIFT},`);
  push('');
  push('  // Moms');
  push(`  VIKTAD_MOMS: ${c.VIKTAD_MOMS},`);
  if (c.PUBLIC_SERVICE_AVGIFT) {
    push('');
    push('  // Public service');
    push(`  PUBLIC_SERVICE_AVGIFT: ${c.PUBLIC_SERVICE_AVGIFT},`);
    push(`  PUBLIC_SERVICE_MAX: ${c.PUBLIC_SERVICE_MAX},`);
    push(`  PUBLIC_SERVICE_TRÖSKELMULTIPLIKATOR: ${c.PUBLIC_SERVICE_TRÖSKELMULTIPLIKATOR},`);
  }
  if (c.SKATTEREDUKTION_FÖRVÄRVSINKOMST) {
    push('');
    push('  // Skattereduktion för förvärvsinkomst');
    const s = c.SKATTEREDUKTION_FÖRVÄRVSINKOMST;
    push(`  SKATTEREDUKTION_FÖRVÄRVSINKOMST: {`);
    push(`    UNDRE: ${s.UNDRE},`);
    push(`    ÖVRE: ${s.ÖVRE},`);
    push(`    SATS: ${s.SATS},`);
    push(`    MAX: ${s.MAX},`);
    push('  },');
  }
  if (c.TILLFÄLLIGT_JOBBSKATTEAVDRAG) {
    push('');
    push('  // Tillfälligt jobbskatteavdrag (2021-2022)');
    const t = c.TILLFÄLLIGT_JOBBSKATTEAVDRAG;
    push('  TILLFÄLLIGT_JOBBSKATTEAVDRAG: {');
    push(`    infasning: { undre: ${t.infasning.undre}, övre: ${t.infasning.övre}, sats: ${t.infasning.sats} },`);
    push(`    max: ${t.max},`);
    push(`    utfasning: { undre: ${t.utfasning.undre}, övre: ${t.utfasning.övre}, sats: ${t.utfasning.sats} },`);
    push('  },');
  }
  push('');
  push('  // Stockholms kommunalskattesats');
  push(`  STOCKHOLMS_SKATTESATS: ${c.STOCKHOLMS_SKATTESATS},`);
  push('');
  push('  // Grundavdragsintervall');
  push('  grundavdragIntervall: [');
  for (const i of c.grundavdragIntervall) {
    push(`    ${formatIntervall(i)},`);
  }
  push('  ],');
  push('');
  push('  // Avtrappning av jobbskatteavdrag ovanför 13.54 PBB');
  push(`  JSA_AVTRAPPNING: { tröskelPBB: ${c.JSA_AVTRAPPNING.tröskelPBB}, sats: ${c.JSA_AVTRAPPNING.sats} },`);
  push('');
  push('  // Jobbskatteavdragsintervall');
  push('  jobbskatteavdragIntervall: [');
  for (const i of c.jobbskatteavdragIntervall) {
    push(`    ${formatIntervall(i)},`);
  }
  push('  ],');
  push('');

  // Kommuner
  push(`  // Kommuner med skattesatser (källa: ${jsonData.källa})`);
  push('  kommuner: [');
  push(`    { namn: 'Riksgenomsnitt', skattesats: ${c.RIKSGENOMSNITT.toFixed(2)} },`);
  for (const k of jsonData.kommuner) {
    push(`    { namn: '${escapeStr(k.namn)}', skattesats: ${k.skattesats.toFixed(2)} },`);
  }
  push('  ],');
  push('');

  // Församlingar
  push('  församlingar: {');
  const sortedKommuner = Object.keys(jsonData.församlingar).sort((a, b) => a.localeCompare(b, 'sv'));
  for (const kommun of sortedKommuner) {
    const lista = jsonData.församlingar[kommun];
    push(`    '${escapeStr(kommun)}': [`);
    for (const f of lista) {
      push(`      { namn: '${escapeStr(f.namn)}', kyrkoavgift: ${f.kyrkoavgift.toFixed(2)} },`);
    }
    push('    ],');
  }
  push('  },');
  push('};');
  push('');

  return lines.join('\n');
}

// === Main ===

for (const år of Object.keys(YEARS)) {
  const content = generateFile(Number(år));
  const outPath = join(ROOT, 'data', `${år}.js`);
  writeFileSync(outPath, content, 'utf-8');
  console.error(`Skrev ${outPath} (${content.split('\n').length} rader)`);
}

console.error('Klart!');
