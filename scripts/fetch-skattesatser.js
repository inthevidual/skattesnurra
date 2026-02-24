#!/usr/bin/env node
// Hämta och bearbeta skattesatser från Skatteverkets öppna data.
// Användning: node scripts/fetch-skattesatser.js <år>
//
// Laddar ner skattesatser-kommuner-{ÅR}.txt, aggregerar från församlingsnivå
// till kommunnivå och skriver ut en kommunlista i JS-format.

const URLS = {
  2024: 'https://skatteverket.se/download/18.7da1d2e118be03f8e4f4a87/skattesatser-kommuner-2024-v3.txt',
  2025: 'https://skatteverket.se/download/18.262c54c219391f2e96326e2/skattesatser-kommuner-2025.txt',
  2026: 'https://skatteverket.se/download/18.1522bf3f19aea8075ba428/1765291540367/skattesatser-kommuner-2026.txt',
};

function titelStil(namn) {
  return namn
    .toLowerCase()
    .replace(/(^|\s|-)(\S)/g, (_, prefix, bokstav) => prefix + bokstav.toUpperCase());
}

async function hämtaOchParsera(år) {
  const url = URLS[år];
  if (!url) {
    console.error(`Okänt år: ${år}. Stödda år: ${Object.keys(URLS).join(', ')}`);
    process.exit(1);
  }

  console.error(`Hämtar ${url} ...`);
  const resp = await fetch(url);
  if (!resp.ok) {
    console.error(`HTTP-fel: ${resp.status} ${resp.statusText}`);
    process.exit(1);
  }

  const text = await resp.text();
  const rader = text.trim().split('\n');

  // Hoppa över rubrikraden
  const dataRader = rader.slice(1);

  // Aggregera per kommun: kommunalskatt + landstingsskatt, samt begravningsavgift
  const kommunMap = new Map();
  // Församlingar per kommun: kyrkoavgift
  const församlingMap = new Map();

  for (const rad of dataRader) {
    const fält = rad.split('\t');
    if (fält.length < 10) continue;

    const kommunNamn = titelStil(fält[2].trim());
    const kommunalskatt = parseFloat(fält[6]);
    const landstingsskatt = parseFloat(fält[7]);
    const begravningsavgift = parseFloat(fält[8]);
    const kyrkoavgift = parseFloat(fält[9]);

    if (!kommunMap.has(kommunNamn)) {
      kommunMap.set(kommunNamn, {
        namn: kommunNamn,
        skattesats: Math.round((kommunalskatt + landstingsskatt) * 100) / 100,
        begravningsavgift: Math.round(begravningsavgift * 100000) / 100000,
      });
    }

    // Församling
    const församlingNamn = titelStil(fält[3].trim());
    if (församlingNamn && !isNaN(kyrkoavgift)) {
      if (!församlingMap.has(kommunNamn)) {
        församlingMap.set(kommunNamn, []);
      }
      församlingMap.get(kommunNamn).push({
        namn: församlingNamn,
        kyrkoavgift: Math.round(kyrkoavgift * 100) / 100,
      });
    }
  }

  // Sortera alfabetiskt
  const kommuner = [...kommunMap.values()].sort((a, b) => a.namn.localeCompare(b.namn, 'sv'));

  // Sortera församlingar inom varje kommun
  for (const [, lista] of församlingMap) {
    lista.sort((a, b) => a.namn.localeCompare(b.namn, 'sv'));
  }

  return { kommuner, församlingMap };
}

async function main() {
  const år = parseInt(process.argv[2], 10);
  if (!år) {
    console.error('Användning: node scripts/fetch-skattesatser.js <år>');
    console.error('Exempel:    node scripts/fetch-skattesatser.js 2025');
    process.exit(1);
  }

  const { kommuner, församlingMap } = await hämtaOchParsera(år);

  console.error(`${kommuner.length} kommuner hittade.`);
  console.error(`${församlingMap.size} kommuner med församlingar, ${[...församlingMap.values()].reduce((s, a) => s + a.length, 0)} församlingar totalt.`);

  // Skriv ut JSON-array till stdout
  const output = kommuner.map(k =>
    `    { namn: '${k.namn}', skattesats: ${k.skattesats.toFixed(2)} },`
  ).join('\n');

  console.log('// Kommuner genererade från Skatteverkets öppna data');
  console.log(`// Källa: skattesatser-kommuner-${år}.txt`);
  console.log(`// Antal kommuner: ${kommuner.length}`);
  console.log('');
  console.log('  kommuner: [');
  console.log(output);
  console.log('  ],');

  // Skriv ut församlingar
  console.log('');
  console.log('  församlingar: {');
  const sortedKommuner = [...församlingMap.keys()].sort((a, b) => a.localeCompare(b, 'sv'));
  for (const kommun of sortedKommuner) {
    const lista = församlingMap.get(kommun);
    const escapedKommun = kommun.includes("'") ? kommun.replace(/'/g, "\\'") : kommun;
    console.log(`    '${escapedKommun}': [`);
    for (const f of lista) {
      const escapedNamn = f.namn.includes("'") ? f.namn.replace(/'/g, "\\'") : f.namn;
      console.log(`      { namn: '${escapedNamn}', kyrkoavgift: ${f.kyrkoavgift.toFixed(2)} },`);
    }
    console.log('    ],');
  }
  console.log('  },');

  // Skriv ut begravningsavgifter för referens
  console.error('\nBegravningsavgifter (för referens):');
  const stockholm = kommuner.find(k => k.namn === 'Stockholm');
  const övriga = kommuner.filter(k => k.namn !== 'Stockholm');
  const avgifter = new Set(övriga.map(k => k.begravningsavgift));
  if (stockholm) {
    console.error(`  Stockholm: ${stockholm.begravningsavgift}`);
  }
  console.error(`  Övriga (unika värden): ${[...avgifter].sort().join(', ')}`);
}

main();
