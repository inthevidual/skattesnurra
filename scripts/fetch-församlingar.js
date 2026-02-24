#!/usr/bin/env node
// Hämta och bearbeta församlingsdata från Skatteverkets öppna data.
// Användning: node scripts/fetch-församlingar.js [år]
//
// Utan argument hämtas alla år 2018–2026.
// Skriver JSON-filer till gamladata/församlingar-YYYY.json.

import { writeFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import XLSX from 'xlsx';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const OUTDIR = join(ROOT, 'gamladata');

const TSV_URLS = {
  2024: 'https://skatteverket.se/download/18.7da1d2e118be03f8e4f4a87/skattesatser-kommuner-2024-v3.txt',
  2025: 'https://skatteverket.se/download/18.262c54c219391f2e96326e2/skattesatser-kommuner-2025.txt',
  2026: 'https://skatteverket.se/download/18.1522bf3f19aea8075ba428/1765291540367/skattesatser-kommuner-2026.txt',
};

const XLSX_URLS = {
  2018: 'https://skatteverket.se/download/18.4a4d586616058d860bc404/Skattesatser+2018.xlsx',
  2019: 'https://skatteverket.se/download/18.309a41aa1672ad0c8377888/1548839270601/skattesatser-2019_3.xlsx',
  2020: 'https://www.skatteverket.se/download/18.6de6b99e16e94f3973b1304/skattesatser-2020.xlsx',
  2021: 'https://www.skatteverket.se/download/18.5b35a6251761e6914203a5d/skattesatser-2021.xlsx',
  2022: 'https://www.skatteverket.se/download/18.339cd9fe17d1714c077224b/skattesatser%202022%20(biab105).xlsx',
  2023: 'https://www.skatteverket.se/download/18.1997e70d1848dabbac94622/1671523156271/Skattesatser%202023%20(Biab105)%20v.3.xlsx',
};

const ALLA_ÅR = [...Object.keys(XLSX_URLS), ...Object.keys(TSV_URLS)].map(Number).sort();

function titelStil(namn) {
  return namn
    .toLowerCase()
    .replace(/(^|\s|-)(\S)/g, (_, prefix, bokstav) => prefix + bokstav.toUpperCase());
}

function källNamn(år) {
  const url = TSV_URLS[år] || XLSX_URLS[år];
  return decodeURIComponent(url.split('/').pop());
}

// Hitta kolumnindex genom att matcha rubrikord i en eller flera rubrikrader.
// Returnerar { kommun, församling, kommunalskatt, landstingsskatt, kyrkoavgift }.
function hittaKolumner(headerRows) {
  const kolumner = { kommun: -1, församling: -1, kommunalskatt: -1, landstingsskatt: -1, kyrkoavgift: -1 };

  const matchers = [
    ['kommun', /^kommun$/],
    ['församling', /^församling$/],
    ['kommunalskatt', /^kommunal/],
    ['landstingsskatt', /^landsting|^region/],
    ['kyrkoavgift', /^kyrkoavgift$/],
  ];

  // Sök igenom varje rubrikrad separat — kolumner kan sitta i olika rader
  const maxCols = Math.max(...headerRows.map(r => r.length));
  for (const row of headerRows) {
    for (let col = 0; col < maxCols; col++) {
      const text = String(row[col] ?? '').trim().toLowerCase().replace(/[- ]/g, '');
      if (!text) continue;
      for (const [namn, regex] of matchers) {
        if (kolumner[namn] === -1 && regex.test(text)) {
          kolumner[namn] = col;
        }
      }
    }
  }

  // Verifiera att alla hittades
  for (const [namn, idx] of Object.entries(kolumner)) {
    if (idx === -1) throw new Error(`Kunde inte hitta kolumn: ${namn}`);
  }

  return kolumner;
}

function parseraRader(rader, kol) {
  const kommunMap = new Map();
  const församlingMap = new Map();

  for (const fält of rader) {
    const kommunRå = String(fält[kol.kommun] ?? '').trim();
    const församlingRå = String(fält[kol.församling] ?? '').trim();
    const kommunalskatt = parseFloat(fält[kol.kommunalskatt]);
    const landstingsskatt = parseFloat(fält[kol.landstingsskatt]);
    const kyrkoavgift = parseFloat(fält[kol.kyrkoavgift]);

    if (!kommunRå || isNaN(kommunalskatt) || isNaN(landstingsskatt)) continue;

    const kommunNamn = titelStil(kommunRå);

    if (!kommunMap.has(kommunNamn)) {
      kommunMap.set(kommunNamn, {
        namn: kommunNamn,
        skattesats: Math.round((kommunalskatt + landstingsskatt) * 100) / 100,
      });
    }

    if (församlingRå && !isNaN(kyrkoavgift)) {
      const församlingNamn = titelStil(församlingRå);
      if (!församlingMap.has(kommunNamn)) {
        församlingMap.set(kommunNamn, []);
      }
      församlingMap.get(kommunNamn).push({
        namn: församlingNamn,
        kyrkoavgift: Math.round(kyrkoavgift * 100) / 100,
      });
    }
  }

  return { kommunMap, församlingMap };
}

// TSV-filer (2024–2026) har fasta kolumner identiska med fetch-skattesatser.js
const TSV_KOLUMNER = { kommun: 2, församling: 3, kommunalskatt: 6, landstingsskatt: 7, kyrkoavgift: 9 };

async function hämtaTSV(år) {
  const url = TSV_URLS[år];
  console.error(`  Hämtar TSV: ${url}`);
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`HTTP ${resp.status} ${resp.statusText}`);

  const text = await resp.text();
  const rader = text.trim().split('\n').slice(1); // hoppa rubrikrad
  return { rader: rader.map(rad => rad.split('\t')), kolumner: TSV_KOLUMNER };
}

async function hämtaXLSX(år) {
  const url = XLSX_URLS[år];
  console.error(`  Hämtar XLSX: ${url}`);
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`HTTP ${resp.status} ${resp.statusText}`);

  const buf = await resp.arrayBuffer();
  const wb = XLSX.read(buf, { type: 'array' });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const allRows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

  // Hitta raden som innehåller "kommun" (exakt match, case-insensitive)
  let kommunRowIdx = -1;
  for (let i = 0; i < Math.min(allRows.length, 20); i++) {
    const row = allRows[i];
    if (row && row.some(cell => /^kommun$/i.test(String(cell).trim()))) {
      kommunRowIdx = i;
      break;
    }
  }
  if (kommunRowIdx === -1) {
    throw new Error(`Kunde inte hitta rubrikrad med "kommun" i XLSX för ${år}`);
  }

  // Samla rubrikrader: nuvarande rad och ev. raden ovanför (för filer där
  // rubriken är uppdelad på två rader, t.ex. 2020)
  const headerRows = [];
  if (kommunRowIdx > 0) headerRows.push(allRows[kommunRowIdx - 1]);
  headerRows.push(allRows[kommunRowIdx]);

  const kolumner = hittaKolumner(headerRows);
  console.error(`  Rubrikrad ${kommunRowIdx + 1}, kolumner: ${JSON.stringify(kolumner)}`);

  return { rader: allRows.slice(kommunRowIdx + 1), kolumner };
}

async function bearbetaÅr(år) {
  console.error(`\nBearbetar ${år}...`);

  let rader, kolumner;
  if (TSV_URLS[år]) {
    ({ rader, kolumner } = await hämtaTSV(år));
  } else if (XLSX_URLS[år]) {
    ({ rader, kolumner } = await hämtaXLSX(år));
  } else {
    throw new Error(`Okänt år: ${år}`);
  }

  const { kommunMap, församlingMap } = parseraRader(rader, kolumner);

  const kommuner = [...kommunMap.values()].sort((a, b) => a.namn.localeCompare(b.namn, 'sv'));

  // Sortera församlingar inom varje kommun
  const församlingar = {};
  const sortedKommuner = [...församlingMap.keys()].sort((a, b) => a.localeCompare(b, 'sv'));
  for (const kommun of sortedKommuner) {
    const lista = församlingMap.get(kommun);
    lista.sort((a, b) => a.namn.localeCompare(b.namn, 'sv'));
    församlingar[kommun] = lista;
  }

  const totalFörs = Object.values(församlingar).reduce((s, a) => s + a.length, 0);
  console.error(`  ${kommuner.length} kommuner, ${totalFörs} församlingar`);

  const data = {
    år,
    källa: källNamn(år),
    kommuner,
    församlingar,
  };

  const filnamn = join(OUTDIR, `församlingar-${år}.json`);
  await mkdir(OUTDIR, { recursive: true });
  await writeFile(filnamn, JSON.stringify(data, null, 2) + '\n', 'utf-8');
  console.error(`  Skrev ${filnamn}`);

  return data;
}

async function main() {
  const arg = process.argv[2];
  const år = arg ? [parseInt(arg, 10)] : ALLA_ÅR;

  if (arg && !ALLA_ÅR.includes(år[0])) {
    console.error(`Okänt år: ${arg}. Stödda år: ${ALLA_ÅR.join(', ')}`);
    process.exit(1);
  }

  console.error(`Hämtar församlingsdata för: ${år.join(', ')}`);

  for (const y of år) {
    await bearbetaÅr(y);
  }

  console.error('\nKlart!');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
