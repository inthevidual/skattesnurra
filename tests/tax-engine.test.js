import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  beräknaGrundavdrag,
  beräknaJobbskatteavdrag,
  beräknaKommunalskatt,
  beräknaSkattereduktionFörvärvsinkomst,
  beräknaStatligSkatt,
  beräknaBegravningsavgift,
  beräknaKyrkoavgift,
  beräknaPensionsavgift,
  beräknaPublicServiceAvgift,
  harRegionalSkattereduktion,
  beräknaSkatteuppdelning,
} from '../js/tax-engine.js';

// PBB = 59200 för 2026, 58800 för 2025
const PBB_2026 = 59200;
const PBB_2025 = 58800;
const PBB = PBB_2026;
const IBB = 83400;

// ─── Grundavdrag ─────────────────────────────────────────────────

describe('beräknaGrundavdrag', () => {
  it('returns 0 for zero income', () => {
    assert.equal(beräknaGrundavdrag(0), 0);
  });

  it('returns 0 for negative income', () => {
    assert.equal(beräknaGrundavdrag(-10000), 0);
  });

  it('tier 1: income < 0.99*PBB', () => {
    // 0.423 * 59200 = 25041.6 → ceil(25041.6/100)*100 = 25100
    assert.equal(beräknaGrundavdrag(50000), 25100);
  });

  it('tier 2: income in [0.99*PBB, 2.72*PBB)', () => {
    // income = 100000
    // 0.225*59200 + 0.2*100000 = 13320 + 20000 = 33320
    // ceil(33320/100)*100 = 33400
    assert.equal(beräknaGrundavdrag(100000), 33400);
  });

  it('tier 2 boundary: income = 0.99*PBB', () => {
    const income = 0.99 * PBB; // 58608
    // 0.225*59200 + 0.2*58608 = 13320 + 11721.6 = 25041.6
    // ceil(25041.6/100)*100 = 25100
    assert.equal(beräknaGrundavdrag(income), 25100);
  });

  it('tier 3: income in [2.72*PBB, 3.11*PBB)', () => {
    const income = 170000; // between 161024 and 184112
    // 0.770 * 59200 = 45584 → ceil(45584/100)*100 = 45600
    assert.equal(beräknaGrundavdrag(income), 45600);
  });

  it('tier 4: income in [3.11*PBB, 7.88*PBB)', () => {
    const income = 300000;
    // 1.081*59200 - 0.1*300000 = 63995.2 - 30000 = 33995.2
    // ceil(33995.2/100)*100 = 34000
    assert.equal(beräknaGrundavdrag(income), 34000);
  });

  it('tier 5: income >= 7.88*PBB', () => {
    const income = 500000; // > 466496
    // 0.293 * 59200 = 17345.6 → ceil(17345.6/100)*100 = 17400
    assert.equal(beräknaGrundavdrag(income), 17400);
  });

  it('tier 4/5 boundary: income = 7.88*PBB', () => {
    const income = 7.88 * PBB; // 466496
    // 0.293 * 59200 = 17345.6 → 17400
    assert.equal(beräknaGrundavdrag(income), 17400);
  });
});

// ─── Jobbskatteavdrag ────────────────────────────────────────────

describe('beräknaJobbskatteavdrag', () => {
  const rate = 0.3238; // Riksgenomsnitt

  it('returns 0 for zero income', () => {
    assert.equal(beräknaJobbskatteavdrag(0, 0, rate), 0);
  });

  it('tier 1: income < 0.91*PBB, floors at 0', () => {
    // Very low income where JSA would be negative
    const income = 10000;
    const grundavdrag = beräknaGrundavdrag(income);
    const jsa = beräknaJobbskatteavdrag(income, grundavdrag, rate);
    assert.equal(jsa, 0); // (10000 - 25100) * 0.3238 < 0 → floored to 0
  });

  it('tier 1: income < 0.91*PBB, positive result', () => {
    const income = 50000;
    const grundavdrag = beräknaGrundavdrag(income); // 25100
    const jsa = beräknaJobbskatteavdrag(income, grundavdrag, rate);
    // (50000 - 25100) * 0.3238 = 24900 * 0.3238 = 8062.62
    assert.ok(Math.abs(jsa - 8062.62) < 0.01);
  });

  it('tier 2: income in [0.91*PBB, 3.24*PBB)', () => {
    const income = 150000;
    const grundavdrag = beräknaGrundavdrag(income);
    const jsa = beräknaJobbskatteavdrag(income, grundavdrag, rate);
    assert.ok(jsa > 0);
  });

  it('tier 3: income in [3.24*PBB, 8.08*PBB)', () => {
    const income = 300000;
    const grundavdrag = beräknaGrundavdrag(income);
    const jsa = beräknaJobbskatteavdrag(income, grundavdrag, rate);
    assert.ok(jsa > 0);
  });

  it('tier 4: income >= 8.08*PBB, JSA is capped', () => {
    const income = 500000;
    const income2 = 600000;
    const ga1 = beräknaGrundavdrag(income); // both tier 5: 17400
    const ga2 = beräknaGrundavdrag(income2);
    const jsa1 = beräknaJobbskatteavdrag(income, ga1, rate);
    const jsa2 = beräknaJobbskatteavdrag(income2, ga2, rate);
    // Both should be the same (capped at 3.027*PBB - grundavdrag)*rate
    // Since grundavdrag is the same (17400), JSA should be identical
    assert.ok(Math.abs(jsa1 - jsa2) < 0.01);
  });
});

// ─── Kommunalskatt ──────────────────────────────────────────────

describe('beräknaKommunalskatt', () => {
  it('calculates correctly', () => {
    // 300000 - 34000 = 266000 * 0.3238 = 86130.80 → Math.round = 86131
    assert.equal(beräknaKommunalskatt(300000, 34000, 0.3238), 86131);
  });

  it('floors at 0 for low income', () => {
    assert.equal(beräknaKommunalskatt(10000, 25100, 0.3238), 0);
  });
});

// ─── Förvärvsinkomstreduktion ────────────────────────────────────

describe('beräknaSkattereduktionFörvärvsinkomst', () => {
  it('returns 0 when taxable income <= 40000', () => {
    assert.equal(beräknaSkattereduktionFörvärvsinkomst(70000, 30000), 0); // 70000-30000 = 40000
  });

  it('returns proportional amount in middle range', () => {
    // taxable = 140000, grundavdrag picked to make taxable = 140000
    // 0.0075 * (140000 - 40000) = 0.0075 * 100000 = 750
    assert.equal(beräknaSkattereduktionFörvärvsinkomst(180000, 40000), 750);
  });

  it('returns max 1500 when taxable income > 240000', () => {
    assert.equal(beräknaSkattereduktionFörvärvsinkomst(300000, 34000), 1500); // 266000 > 240000
  });
});

// ─── Statlig skatt ──────────────────────────────────────────────

describe('beräknaStatligSkatt', () => {
  it('returns 0 below brytpunkt', () => {
    const result = beräknaStatligSkatt(600000);
    assert.equal(result.belopp, 0);
    assert.equal(result.marginalsats, 0);
  });

  it('returns 0 at exactly brytpunkt', () => {
    const result = beräknaStatligSkatt(660400);
    assert.equal(result.belopp, 0);
    assert.equal(result.marginalsats, 0);
  });

  it('returns 20% above brytpunkt', () => {
    const result = beräknaStatligSkatt(760400);
    // (760400 - 660400) * 0.20 = 100000 * 0.20 = 20000
    assert.equal(result.belopp, 20000);
    assert.equal(result.marginalsats, 0.20);
  });
});

// ─── Begravningsavgift ──────────────────────────────────────────

describe('beräknaBegravningsavgift', () => {
  it('uses default rate for non-Stockholm', () => {
    // (300000 - 34000) * 0.00292 = 266000 * 0.00292 = 776.72
    const fee = beräknaBegravningsavgift(300000, 34000, 'Malmö');
    assert.ok(Math.abs(fee - 776.72) < 0.01);
  });

  it('uses Stockholm rate', () => {
    // (300000 - 17400) * 0.0007 = 282600 * 0.0007 = 197.82
    const fee = beräknaBegravningsavgift(300000, 17400, 'Stockholm');
    assert.ok(Math.abs(fee - 197.82) < 0.01);
  });

  it('floors at 0 for very low income', () => {
    const fee = beräknaBegravningsavgift(10000, 25100, 'Malmö');
    assert.equal(fee, 0);
  });
});

// ─── Pensionsavgift ─────────────────────────────────────────────

describe('beräknaPensionsavgift', () => {
  it('returns 0 for income below minimum', () => {
    // minInkomst = ceil(0.423*59200/100)*100 = 25100
    assert.equal(beräknaPensionsavgift(20000, 5000), 0);
  });

  it('returns 0 when pension < income tax', () => {
    // For moderate income, pension tends to be less than income tax
    // income=300000: pension = round((0.07*floor(300000/100)*100)/100)*100
    // = round((0.07*300000)/100)*100 = round(21000/100)*100 = round(210)*100 = 21000
    // If incomeTax = 52000, then pension (21000) < tax (52000) → 0
    assert.equal(beräknaPensionsavgift(300000, 52000), 0);
  });

  it('returns pension - incomeTax when pension >= incomeTax', () => {
    // Very low tax scenario with moderate income
    // income=100000: pension = round((0.07*100000)/100)*100 = round(70)*100 = 7000
    // If incomeTax = 3000, pension (7000) >= tax (3000) → 7000-3000 = 4000
    assert.equal(beräknaPensionsavgift(100000, 3000), 4000);
  });
});

// ─── Public service-avgift ──────────────────────────────────────

describe('beräknaPublicServiceAvgift', () => {
  it('returns rate-based fee below threshold', () => {
    // 1.42 * IBB = 1.42 * 83400 = 118428
    // income = 150000, grundavdrag = ~45600 (tier 3)
    // taxable = 150000 - 45600 = 104400 <= 118428
    // fee = 0.01 * 104400 = 1044
    const fee = beräknaPublicServiceAvgift(150000, 45600);
    assert.ok(Math.abs(fee - 1044) < 0.01);
  });

  it('returns max 1184 above threshold', () => {
    // income = 300000, grundavdrag = 34000
    // taxable = 266000 > 118428
    const fee = beräknaPublicServiceAvgift(300000, 34000);
    assert.equal(fee, 1184);
  });

  it('returns 0 when taxable income <= 0', () => {
    assert.equal(beräknaPublicServiceAvgift(10000, 25100), 0);
  });
});

// ─── Regional skattereduktion ───────────────────────────────────

describe('harRegionalSkattereduktion', () => {
  it('returns true for qualifying municipality', () => {
    assert.equal(harRegionalSkattereduktion('Kiruna'), true);
    assert.equal(harRegionalSkattereduktion('Åsele'), true);
    assert.equal(harRegionalSkattereduktion('Bollnäs'), true);
  });

  it('returns false for non-qualifying municipality', () => {
    assert.equal(harRegionalSkattereduktion('Stockholm'), false);
    assert.equal(harRegionalSkattereduktion('Malmö'), false);
    assert.equal(harRegionalSkattereduktion('Riksgenomsnitt'), false);
  });

  it('returns true for Filipstad (bug fix: was "Filipstads" in original)', () => {
    assert.equal(harRegionalSkattereduktion('Filipstad'), true);
    assert.equal(harRegionalSkattereduktion('Filipstads'), false);
  });
});

// ─── Kyrkoavgift ──────────────────────────────────────────────────

describe('beräknaKyrkoavgift', () => {
  it('calculates correctly', () => {
    // (300000 - 34000) * 0.0086 = 266000 * 0.0086 = 2287.6
    const fee = beräknaKyrkoavgift(300000, 34000, 0.0086);
    assert.ok(Math.abs(fee - 2287.6) < 0.01);
  });

  it('floors at 0 for low income', () => {
    const fee = beräknaKyrkoavgift(10000, 25100, 0.0086);
    assert.equal(fee, 0);
  });

  it('returns 0 for zero rate', () => {
    assert.equal(beräknaKyrkoavgift(300000, 34000, 0), 0);
  });
});

// ─── Full Tax Breakdown (Integration Tests) ──────────────────────

describe('beräknaSkatteuppdelning', () => {
  it('returns null for zero income', () => {
    const result = beräknaSkatteuppdelning({
      månadslön: 0,
      kommunalSkattesats: 32.38,
      kommunNamn: 'Riksgenomsnitt',
    });
    assert.equal(result, null);
  });

  it('baseline: 25000 kr/mo, Riksgenomsnitt', () => {
    const result = beräknaSkatteuppdelning({
      månadslön: 25000,
      kommunalSkattesats: 32.38,
      kommunNamn: 'Riksgenomsnitt',
    });

    assert.equal(result.årsinkomst, 300000);
    assert.equal(result.grundavdrag, 34000);
    assert.equal(result.statligSkatt, 0);
    assert.ok(result.jobbskatteavdrag > 0);
    assert.ok(result.kommunalskatt > 0);
    assert.equal(result.skattereduktionFörvärvsinkomst, 1500);
    assert.equal(result.regionalReduktion, 0);
    assert.ok(result.nettoÅrsinkomst > 0);
    assert.ok(result.totalSkatt > 0);
    assert.ok(result.genomsnittligSkattesats > 0 && result.genomsnittligSkattesats < 1);
  });

  it('Stockholm: 35000 kr/mo, special burial fee', () => {
    const result = beräknaSkatteuppdelning({
      månadslön: 35000,
      kommunalSkattesats: 30.55,
      kommunNamn: 'Stockholm',
    });

    // Stockholm should have lower burial fee
    const nonStockholm = beräknaSkatteuppdelning({
      månadslön: 35000,
      kommunalSkattesats: 30.55,
      kommunNamn: 'Riksgenomsnitt',
    });

    assert.ok(result.begravningsavgift < nonStockholm.begravningsavgift);
  });

  it('Kiruna: regional reduction applies', () => {
    const result = beräknaSkatteuppdelning({
      månadslön: 50000,
      kommunalSkattesats: 34.39,
      kommunNamn: 'Kiruna',
    });

    assert.equal(result.regionalReduktion, 1675);
  });

  it('high income: state tax kicks in above brytpunkt', () => {
    const result = beräknaSkatteuppdelning({
      månadslön: 60000,
      kommunalSkattesats: 32.38,
      kommunNamn: 'Riksgenomsnitt',
    });

    // 60000 * 12 = 720000 > 660400
    assert.ok(result.statligSkatt > 0);
    assert.ok(Math.abs(result.statligSkatt - (720000 - 660400) * 0.2) < 0.01);
  });

  it('very high income: 100000 kr/mo', () => {
    const result = beräknaSkatteuppdelning({
      månadslön: 100000,
      kommunalSkattesats: 32.42,
      kommunNamn: 'Malmö',
    });

    assert.equal(result.årsinkomst, 1200000);
    assert.ok(result.statligSkatt > 0);
    assert.ok(result.totalSkatt > 0);
    assert.ok(result.genomsnittligSkattesats > 0.5); // High income = high average tax
  });

  it('low income: 5000 kr/mo', () => {
    const result = beräknaSkatteuppdelning({
      månadslön: 5000,
      kommunalSkattesats: 32.38,
      kommunNamn: 'Riksgenomsnitt',
    });

    assert.equal(result.årsinkomst, 60000);
    assert.equal(result.statligSkatt, 0);
    assert.ok(result.grundavdrag > 0);
    assert.ok(result.nettoÅrsinkomst > 0);
  });

  it('all breakdown values are numbers', () => {
    const result = beräknaSkatteuppdelning({
      månadslön: 30000,
      kommunalSkattesats: 32.38,
      kommunNamn: 'Riksgenomsnitt',
    });

    for (const [key, value] of Object.entries(result)) {
      assert.equal(typeof value, 'number', `${key} should be a number`);
    }
  });

  it('no regional reduction for non-qualifying municipality', () => {
    const result = beräknaSkatteuppdelning({
      månadslön: 30000,
      kommunalSkattesats: 32.42,
      kommunNamn: 'Malmö',
    });

    assert.equal(result.regionalReduktion, 0);
  });

  it('kyrkoavgift included when rate provided', () => {
    const result = beräknaSkatteuppdelning({
      månadslön: 25000,
      kommunalSkattesats: 32.38,
      kommunNamn: 'Riksgenomsnitt',
      kyrkoavgiftSats: 0.86,
    });
    assert.ok(result.kyrkoavgift > 0);
    // (300000 - 34000) * 0.0086 = 2287.6
    assert.ok(Math.abs(result.kyrkoavgift - 2287.6) < 0.01);
  });

  it('kyrkoavgift is 0 when rate absent', () => {
    const result = beräknaSkatteuppdelning({
      månadslön: 25000,
      kommunalSkattesats: 32.38,
      kommunNamn: 'Riksgenomsnitt',
    });
    assert.equal(result.kyrkoavgift, 0);
  });

  it('kyrkoavgift reduces netto and increases totalSkatt', () => {
    const utan = beräknaSkatteuppdelning({
      månadslön: 25000,
      kommunalSkattesats: 32.38,
      kommunNamn: 'Riksgenomsnitt',
    });
    const med = beräknaSkatteuppdelning({
      månadslön: 25000,
      kommunalSkattesats: 32.38,
      kommunNamn: 'Riksgenomsnitt',
      kyrkoavgiftSats: 0.86,
    });
    assert.ok(med.nettoÅrsinkomst < utan.nettoÅrsinkomst);
    assert.ok(med.totalSkatt > utan.totalSkatt);
  });

  it('employer cost = salary + employer contribution', () => {
    const result = beräknaSkatteuppdelning({
      månadslön: 40000,
      kommunalSkattesats: 32.38,
      kommunNamn: 'Riksgenomsnitt',
    });

    assert.ok(
      Math.abs(result.totalArbetsgivarkostnad - (result.årsinkomst + result.arbetsgivaravgift)) < 0.01
    );
  });
});

// ─── Inkomstår 2025 ──────────────────────────────────────────────

describe('2025: grundavdrag uses 2025 PBB', () => {
  it('tier 1: different PBB gives different grundavdrag', () => {
    // 0.423 * 58800 = 24872.4 → ceil(24872.4/100)*100 = 24900
    assert.equal(beräknaGrundavdrag(50000, 2025), 24900);
    // 2026: 25100
    assert.equal(beräknaGrundavdrag(50000, 2026), 25100);
  });

  it('tier 5: high income', () => {
    // 0.293 * 58800 = 17228.4 → ceil(17228.4/100)*100 = 17300
    assert.equal(beräknaGrundavdrag(500000, 2025), 17300);
  });
});

describe('2025: jobbskatteavdrag has lower slope and cap', () => {
  const rate = 0.3241; // 2025 riksgenomsnitt

  it('tier 3 gives lower JSA for 2025 than 2026 (lower slope)', () => {
    const income = 300000;
    const ga2025 = beräknaGrundavdrag(income, 2025);
    const ga2026 = beräknaGrundavdrag(income, 2026);
    const jsa2025 = beräknaJobbskatteavdrag(income, ga2025, rate, 2025);
    const jsa2026 = beräknaJobbskatteavdrag(income, ga2026, rate, 2026);
    assert.ok(jsa2025 < jsa2026, `2025 JSA (${jsa2025}) should be less than 2026 JSA (${jsa2026})`);
  });

  it('tier 4 cap is lower for 2025', () => {
    const income = 600000;
    const ga2025 = beräknaGrundavdrag(income, 2025);
    const ga2026 = beräknaGrundavdrag(income, 2026);
    const jsa2025 = beräknaJobbskatteavdrag(income, ga2025, rate, 2025);
    const jsa2026 = beräknaJobbskatteavdrag(income, ga2026, rate, 2026);
    // 2025 cap: (2.776*PBB - ga)*rate vs 2026 cap: (3.027*PBB - ga)*rate
    assert.ok(jsa2025 < jsa2026, `2025 JSA cap (${jsa2025}) should be less than 2026 (${jsa2026})`);
  });
});

describe('2025: statlig skatt uses lower brytpunkt', () => {
  it('income between 2025 and 2026 brytpunkt triggers tax only for 2025', () => {
    // 2025 brytpunkt: 625800, 2026 brytpunkt: 660400
    const income = 640000;
    const result2025 = beräknaStatligSkatt(income, 2025);
    const result2026 = beräknaStatligSkatt(income, 2026);
    assert.ok(result2025.belopp > 0, '2025: should have state tax');
    assert.equal(result2026.belopp, 0, '2026: should have no state tax');
    assert.ok(Math.abs(result2025.belopp - (640000 - 625800) * 0.2) < 0.01);
  });
});

describe('2025: public service max is different', () => {
  it('returns 2025 max (1249) above threshold', () => {
    const fee = beräknaPublicServiceAvgift(300000, 17300, 2025);
    assert.equal(fee, 1249);
  });

  it('returns 2026 max (1184) above threshold', () => {
    const fee = beräknaPublicServiceAvgift(300000, 17400, 2026);
    assert.equal(fee, 1184);
  });
});

describe('2025: begravningsavgift uses 2025 rate', () => {
  it('non-Stockholm uses 0.00293 for 2025', () => {
    // (300000 - 33800) * 0.00293 = 266200 * 0.00293 = 779.966
    const ga = beräknaGrundavdrag(300000, 2025); // tier 4: ceil((1.081*58800 - 0.1*300000)/100)*100
    const fee = beräknaBegravningsavgift(300000, ga, 'Malmö', 2025);
    assert.ok(fee > 0);
    assert.ok(Math.abs(fee - (300000 - ga) * 0.00293) < 0.01);
  });
});

describe('2025: full breakdown integration', () => {
  it('baseline: 25000 kr/mo, Riksgenomsnitt', () => {
    const result = beräknaSkatteuppdelning({
      månadslön: 25000,
      kommunalSkattesats: 32.41,
      kommunNamn: 'Riksgenomsnitt',
    }, 2025);

    assert.equal(result.årsinkomst, 300000);
    assert.ok(result.grundavdrag > 0);
    assert.equal(result.statligSkatt, 0);
    assert.ok(result.jobbskatteavdrag > 0);
    assert.ok(result.nettoÅrsinkomst > 0);
  });

  it('2025 vs 2026 gives different results for same salary', () => {
    const indata = {
      månadslön: 40000,
      kommunalSkattesats: 32.38,
      kommunNamn: 'Riksgenomsnitt',
    };
    const r2025 = beräknaSkatteuppdelning(indata, 2025);
    const r2026 = beräknaSkatteuppdelning(indata, 2026);

    // Different PBB → different grundavdrag
    assert.notEqual(r2025.grundavdrag, r2026.grundavdrag);
    // Different JSA parameters → different jobbskatteavdrag
    assert.notEqual(r2025.jobbskatteavdrag, r2026.jobbskatteavdrag);
  });

  it('throws for unsupported year', () => {
    assert.throws(() => beräknaSkatteuppdelning({
      månadslön: 25000,
      kommunalSkattesats: 32.38,
      kommunNamn: 'Riksgenomsnitt',
    }, 2020), /stöds inte/);
  });
});

// ─── Inkomstår 2024 ──────────────────────────────────────────────

describe('2024: grundavdrag uses 2024 PBB', () => {
  it('tier 1: PBB 57300 gives different grundavdrag', () => {
    // 0.423 * 57300 = 24237.9 → ceil(24237.9/100)*100 = 24300
    assert.equal(beräknaGrundavdrag(50000, 2024), 24300);
  });

  it('tier 5: high income', () => {
    // 0.293 * 57300 = 16788.9 → ceil(16788.9/100)*100 = 16800
    assert.equal(beräknaGrundavdrag(500000, 2024), 16800);
  });
});

describe('2024: jobbskatteavdrag has lower slope and cap than 2025', () => {
  const rate = 0.3237; // 2024 riksgenomsnitt

  it('tier 3 gives lower JSA for 2024 than 2025 (lower slope)', () => {
    const income = 300000;
    const ga2024 = beräknaGrundavdrag(income, 2024);
    const ga2025 = beräknaGrundavdrag(income, 2025);
    const jsa2024 = beräknaJobbskatteavdrag(income, ga2024, rate, 2024);
    const jsa2025 = beräknaJobbskatteavdrag(income, ga2025, rate, 2025);
    assert.ok(jsa2024 < jsa2025, `2024 JSA (${jsa2024}) should be less than 2025 JSA (${jsa2025})`);
  });

  it('tier 4 cap is lower for 2024 than 2025', () => {
    const income = 600000;
    const ga2024 = beräknaGrundavdrag(income, 2024);
    const ga2025 = beräknaGrundavdrag(income, 2025);
    const jsa2024 = beräknaJobbskatteavdrag(income, ga2024, rate, 2024);
    const jsa2025 = beräknaJobbskatteavdrag(income, ga2025, rate, 2025);
    // 2024 cap: (2.608*PBB - ga)*rate vs 2025 cap: (2.776*PBB - ga)*rate
    assert.ok(jsa2024 < jsa2025, `2024 JSA cap (${jsa2024}) should be less than 2025 (${jsa2025})`);
  });
});

describe('2024: statlig skatt uses lower brytpunkt', () => {
  it('income between 2024 and 2025 brytpunkt triggers tax only for 2024', () => {
    // 2024 brytpunkt: 615300, 2025 brytpunkt: 625800
    const income = 620000;
    const result2024 = beräknaStatligSkatt(income, 2024);
    const result2025 = beräknaStatligSkatt(income, 2025);
    assert.ok(result2024.belopp > 0, '2024: should have state tax');
    assert.equal(result2025.belopp, 0, '2025: should have no state tax');
    assert.ok(Math.abs(result2024.belopp - (620000 - 615300) * 0.2) < 0.01);
  });
});

describe('2024: public service has higher threshold multiplier', () => {
  it('returns 2024 max (1219) above threshold', () => {
    // threshold = 1.6 * 76200 = 121920
    const fee = beräknaPublicServiceAvgift(300000, 16800, 2024);
    assert.equal(fee, 1219);
  });

  it('below threshold uses rate', () => {
    // taxable = 150000 - 24300 = 125700, but threshold = 121920
    // 125700 > 121920, so should return max. Use lower income instead.
    // taxable = 100000 - 24300 = 75700 < 121920
    const fee = beräknaPublicServiceAvgift(100000, 24300, 2024);
    assert.ok(Math.abs(fee - 0.01 * 75700) < 0.01);
  });
});

describe('2024: begravningsavgift uses 2024 rates', () => {
  it('non-Stockholm uses 0.00277 for 2024', () => {
    const ga = beräknaGrundavdrag(300000, 2024);
    const fee = beräknaBegravningsavgift(300000, ga, 'Malmö', 2024);
    assert.ok(Math.abs(fee - (300000 - ga) * 0.00277) < 0.01);
  });

  it('Stockholm uses 0.00065 for 2024', () => {
    const ga = beräknaGrundavdrag(300000, 2024);
    const fee = beräknaBegravningsavgift(300000, ga, 'Stockholm', 2024);
    assert.ok(Math.abs(fee - (300000 - ga) * 0.00065) < 0.01);
  });
});

describe('2024: full breakdown integration', () => {
  it('baseline: 25000 kr/mo, Riksgenomsnitt', () => {
    const result = beräknaSkatteuppdelning({
      månadslön: 25000,
      kommunalSkattesats: 32.37,
      kommunNamn: 'Riksgenomsnitt',
    }, 2024);

    assert.equal(result.årsinkomst, 300000);
    assert.ok(result.grundavdrag > 0);
    assert.equal(result.statligSkatt, 0);
    assert.ok(result.jobbskatteavdrag > 0);
    assert.ok(result.nettoÅrsinkomst > 0);
  });

  it('2024 vs 2025 gives different results for same salary', () => {
    const indata = {
      månadslön: 40000,
      kommunalSkattesats: 32.37,
      kommunNamn: 'Riksgenomsnitt',
    };
    const r2024 = beräknaSkatteuppdelning(indata, 2024);
    const r2025 = beräknaSkatteuppdelning(indata, 2025);

    // Different PBB → different grundavdrag
    assert.notEqual(r2024.grundavdrag, r2025.grundavdrag);
    // Different JSA parameters → different jobbskatteavdrag
    assert.notEqual(r2024.jobbskatteavdrag, r2025.jobbskatteavdrag);
  });

  it('2024 has higher total tax than 2025 at moderate income (lower JSA)', () => {
    const indata = {
      månadslön: 35000,
      kommunalSkattesats: 32.37,
      kommunNamn: 'Riksgenomsnitt',
    };
    const r2024 = beräknaSkatteuppdelning(indata, 2024);
    const r2025 = beräknaSkatteuppdelning(indata, 2025);

    // 2024 has lower jobbskatteavdrag → higher inkomstskatt → lower netto
    assert.ok(r2024.jobbskatteavdrag < r2025.jobbskatteavdrag,
      `2024 JSA (${r2024.jobbskatteavdrag}) should be less than 2025 (${r2025.jobbskatteavdrag})`);
  });
});

// ─── Inkomstår 2023 ──────────────────────────────────────────────

describe('2023: grundavdrag uses 2023 PBB', () => {
  it('tier 1: PBB 52500 gives different grundavdrag', () => {
    // 0.423 * 52500 = 22207.5 → ceil(22207.5/100)*100 = 22300
    assert.equal(beräknaGrundavdrag(50000, 2023), 22300);
  });

  it('tier 5: high income', () => {
    // 0.293 * 52500 = 15382.5 → ceil(15382.5/100)*100 = 15400
    assert.equal(beräknaGrundavdrag(500000, 2023), 15400);
  });
});

describe('2023: jobbskatteavdrag has lower slope and cap than 2024', () => {
  const rate = 0.3224; // 2023 riksgenomsnitt

  it('tier 3 gives lower JSA for 2023 than 2024 (lower slope)', () => {
    const income = 300000;
    const ga2023 = beräknaGrundavdrag(income, 2023);
    const ga2024 = beräknaGrundavdrag(income, 2024);
    const jsa2023 = beräknaJobbskatteavdrag(income, ga2023, rate, 2023);
    const jsa2024 = beräknaJobbskatteavdrag(income, ga2024, rate, 2024);
    assert.ok(jsa2023 < jsa2024, `2023 JSA (${jsa2023}) should be less than 2024 JSA (${jsa2024})`);
  });

  it('tier 4 cap is lower for 2023 than 2024', () => {
    const income = 600000;
    const ga2023 = beräknaGrundavdrag(income, 2023);
    const ga2024 = beräknaGrundavdrag(income, 2024);
    const jsa2023 = beräknaJobbskatteavdrag(income, ga2023, rate, 2023);
    const jsa2024 = beräknaJobbskatteavdrag(income, ga2024, rate, 2024);
    assert.ok(jsa2023 < jsa2024, `2023 JSA cap (${jsa2023}) should be less than 2024 (${jsa2024})`);
  });
});

describe('2023: statlig skatt uses lower brytpunkt', () => {
  it('income between 2023 and 2024 brytpunkt triggers tax only for 2023', () => {
    // 2023 brytpunkt: 613900, 2024 brytpunkt: 615300
    const income = 614500;
    const result2023 = beräknaStatligSkatt(income, 2023);
    const result2024 = beräknaStatligSkatt(income, 2024);
    assert.ok(result2023.belopp > 0, '2023: should have state tax');
    assert.equal(result2024.belopp, 0, '2024: should have no state tax');
    assert.ok(Math.abs(result2023.belopp - (614500 - 613900) * 0.2) < 0.01);
  });
});

describe('2023: public service has higher threshold multiplier', () => {
  it('returns 2023 max (1300) above threshold', () => {
    // threshold = 1.75 * 74300 = 130025
    const fee = beräknaPublicServiceAvgift(300000, 15400, 2023);
    assert.equal(fee, 1300);
  });
});

describe('2023: begravningsavgift uses 2023 rates', () => {
  it('non-Stockholm uses 0.00258 for 2023', () => {
    const ga = beräknaGrundavdrag(300000, 2023);
    const fee = beräknaBegravningsavgift(300000, ga, 'Malmö', 2023);
    assert.ok(Math.abs(fee - (300000 - ga) * 0.00258) < 0.01);
  });
});

describe('2023: full breakdown integration', () => {
  it('baseline: 25000 kr/mo, Riksgenomsnitt', () => {
    const result = beräknaSkatteuppdelning({
      månadslön: 25000,
      kommunalSkattesats: 32.24,
      kommunNamn: 'Riksgenomsnitt',
    }, 2023);

    assert.equal(result.årsinkomst, 300000);
    assert.ok(result.grundavdrag > 0);
    assert.equal(result.statligSkatt, 0);
    assert.ok(result.jobbskatteavdrag > 0);
    assert.ok(result.nettoÅrsinkomst > 0);
  });

  it('2023 vs 2024 gives different results for same salary', () => {
    const indata = {
      månadslön: 40000,
      kommunalSkattesats: 32.24,
      kommunNamn: 'Riksgenomsnitt',
    };
    const r2023 = beräknaSkatteuppdelning(indata, 2023);
    const r2024 = beräknaSkatteuppdelning(indata, 2024);

    assert.notEqual(r2023.grundavdrag, r2024.grundavdrag);
    assert.notEqual(r2023.jobbskatteavdrag, r2024.jobbskatteavdrag);
  });

  it('2023 has lower JSA than 2024 at moderate income', () => {
    const indata = {
      månadslön: 35000,
      kommunalSkattesats: 32.24,
      kommunNamn: 'Riksgenomsnitt',
    };
    const r2023 = beräknaSkatteuppdelning(indata, 2023);
    const r2024 = beräknaSkatteuppdelning(indata, 2024);

    assert.ok(r2023.jobbskatteavdrag < r2024.jobbskatteavdrag,
      `2023 JSA (${r2023.jobbskatteavdrag}) should be less than 2024 (${r2024.jobbskatteavdrag})`);
  });
});

// ─── JSA avtrappning (phase-out) 2023/2024 ──────────────────────────

describe('JSA avtrappning (phase-out) for 2023 and 2024', () => {
  const PBB_2023 = 52500;
  const PBB_2024 = 57300;
  const rate = 0.3224;

  it('2023: JSA at exactly 13.54 PBB equals tier-4 cap (no phase-out yet)', () => {
    const income = 13.54 * PBB_2023; // 710850
    const ga = beräknaGrundavdrag(income, 2023);
    const jsa = beräknaJobbskatteavdrag(income, ga, rate, 2023);
    // tier-4 cap: (2.432 * PBB - ga) * rate
    const expectedCap = (2.432 * PBB_2023 - ga) * rate;
    assert.ok(Math.abs(jsa - expectedCap) < 1,
      `JSA (${jsa}) should equal tier-4 cap (${expectedCap}) at threshold`);
  });

  it('2023: JSA decreases above 13.54 PBB', () => {
    const belowIncome = 13.54 * PBB_2023;
    const aboveIncome = 15 * PBB_2023; // 787500
    const gaBelow = beräknaGrundavdrag(belowIncome, 2023);
    const gaAbove = beräknaGrundavdrag(aboveIncome, 2023);
    const jsaBelow = beräknaJobbskatteavdrag(belowIncome, gaBelow, rate, 2023);
    const jsaAbove = beräknaJobbskatteavdrag(aboveIncome, gaAbove, rate, 2023);
    assert.ok(jsaAbove < jsaBelow,
      `JSA above threshold (${jsaAbove}) should be less than at threshold (${jsaBelow})`);
  });

  it('2024: JSA decreases above 13.54 PBB', () => {
    const belowIncome = 13.54 * PBB_2024;
    const aboveIncome = 15 * PBB_2024;
    const gaBelow = beräknaGrundavdrag(belowIncome, 2024);
    const gaAbove = beräknaGrundavdrag(aboveIncome, 2024);
    const jsaBelow = beräknaJobbskatteavdrag(belowIncome, gaBelow, rate, 2024);
    const jsaAbove = beräknaJobbskatteavdrag(aboveIncome, gaAbove, rate, 2024);
    assert.ok(jsaAbove < jsaBelow,
      `JSA above threshold (${jsaAbove}) should be less than at threshold (${jsaBelow})`);
  });

  it('2023: JSA reaches 0 at sufficiently high income', () => {
    const income = 40 * PBB_2023; // 2 100 000
    const ga = beräknaGrundavdrag(income, 2023);
    const jsa = beräknaJobbskatteavdrag(income, ga, rate, 2023);
    assert.equal(jsa, 0, 'JSA should be 0 at very high income');
  });

  it('2025 and 2026 have no phase-out at same PBB-relative income', () => {
    // At 15 PBB, 2025/2026 should still have full tier-4 JSA (no avtrappning)
    const PBB_2025x = 58800;
    const PBB_2026x = 59200;
    const income2025 = 15 * PBB_2025x;
    const income2026 = 15 * PBB_2026x;

    const ga2025 = beräknaGrundavdrag(income2025, 2025);
    const ga2026 = beräknaGrundavdrag(income2026, 2026);
    const jsa2025 = beräknaJobbskatteavdrag(income2025, ga2025, rate, 2025);
    const jsa2026 = beräknaJobbskatteavdrag(income2026, ga2026, rate, 2026);

    // For 2025/2026, JSA at 15 PBB should equal the tier-4 cap (no reduction)
    const cap2025 = (2.776 * PBB_2025x - ga2025) * rate;
    const cap2026 = (3.027 * PBB_2026x - ga2026) * rate;
    assert.ok(Math.abs(jsa2025 - cap2025) < 1,
      `2025 JSA (${jsa2025}) should equal tier-4 cap (${cap2025}), no phase-out`);
    assert.ok(Math.abs(jsa2026 - cap2026) < 1,
      `2026 JSA (${jsa2026}) should equal tier-4 cap (${cap2026}), no phase-out`);
  });
});
