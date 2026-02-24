import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  calculateGrundavdrag,
  calculateJobbskatteavdrag,
  calculateMunicipalTax,
  calculateEmploymentIncomeReduction,
  calculateStateTax,
  calculateBurialFee,
  calculatePensionContribution,
  calculatePublicServiceFee,
  isRegionalReductionEligible,
  calculateTaxBreakdown,
} from '../js/tax-engine.js';

// PBB = 59200 for 2026
const PBB = 59200;
const IBB = 83400;

// ─── Grundavdrag ─────────────────────────────────────────────────

describe('calculateGrundavdrag', () => {
  it('returns 0 for zero income', () => {
    assert.equal(calculateGrundavdrag(0), 0);
  });

  it('returns 0 for negative income', () => {
    assert.equal(calculateGrundavdrag(-10000), 0);
  });

  it('tier 1: income < 0.99*PBB', () => {
    // 0.423 * 59200 = 25041.6 → ceil(25041.6/100)*100 = 25100
    assert.equal(calculateGrundavdrag(50000), 25100);
  });

  it('tier 2: income in [0.99*PBB, 2.72*PBB)', () => {
    // income = 100000
    // 0.225*59200 + 0.2*100000 = 13320 + 20000 = 33320
    // ceil(33320/100)*100 = 33400
    assert.equal(calculateGrundavdrag(100000), 33400);
  });

  it('tier 2 boundary: income = 0.99*PBB', () => {
    const income = 0.99 * PBB; // 58608
    // 0.225*59200 + 0.2*58608 = 13320 + 11721.6 = 25041.6
    // ceil(25041.6/100)*100 = 25100
    assert.equal(calculateGrundavdrag(income), 25100);
  });

  it('tier 3: income in [2.72*PBB, 3.11*PBB)', () => {
    const income = 170000; // between 161024 and 184112
    // 0.770 * 59200 = 45584 → ceil(45584/100)*100 = 45600
    assert.equal(calculateGrundavdrag(income), 45600);
  });

  it('tier 4: income in [3.11*PBB, 7.88*PBB)', () => {
    const income = 300000;
    // 1.081*59200 - 0.1*300000 = 63995.2 - 30000 = 33995.2
    // ceil(33995.2/100)*100 = 34000
    assert.equal(calculateGrundavdrag(income), 34000);
  });

  it('tier 5: income >= 7.88*PBB', () => {
    const income = 500000; // > 466496
    // 0.293 * 59200 = 17345.6 → ceil(17345.6/100)*100 = 17400
    assert.equal(calculateGrundavdrag(income), 17400);
  });

  it('tier 4/5 boundary: income = 7.88*PBB', () => {
    const income = 7.88 * PBB; // 466496
    // 0.293 * 59200 = 17345.6 → 17400
    assert.equal(calculateGrundavdrag(income), 17400);
  });
});

// ─── Jobbskatteavdrag ────────────────────────────────────────────

describe('calculateJobbskatteavdrag', () => {
  const rate = 0.3238; // Riksgenomsnitt

  it('returns 0 for zero income', () => {
    assert.equal(calculateJobbskatteavdrag(0, 0, rate), 0);
  });

  it('tier 1: income < 0.91*PBB, floors at 0', () => {
    // Very low income where JSA would be negative
    const income = 10000;
    const grundavdrag = calculateGrundavdrag(income);
    const jsa = calculateJobbskatteavdrag(income, grundavdrag, rate);
    assert.equal(jsa, 0); // (10000 - 25100) * 0.3238 < 0 → floored to 0
  });

  it('tier 1: income < 0.91*PBB, positive result', () => {
    const income = 50000;
    const grundavdrag = calculateGrundavdrag(income); // 25100
    const jsa = calculateJobbskatteavdrag(income, grundavdrag, rate);
    // (50000 - 25100) * 0.3238 = 24900 * 0.3238 = 8062.62
    assert.ok(Math.abs(jsa - 8062.62) < 0.01);
  });

  it('tier 2: income in [0.91*PBB, 3.24*PBB)', () => {
    const income = 150000;
    const grundavdrag = calculateGrundavdrag(income);
    const jsa = calculateJobbskatteavdrag(income, grundavdrag, rate);
    assert.ok(jsa > 0);
  });

  it('tier 3: income in [3.24*PBB, 8.08*PBB)', () => {
    const income = 300000;
    const grundavdrag = calculateGrundavdrag(income);
    const jsa = calculateJobbskatteavdrag(income, grundavdrag, rate);
    assert.ok(jsa > 0);
  });

  it('tier 4: income >= 8.08*PBB, JSA is capped', () => {
    const income = 500000;
    const income2 = 600000;
    const ga1 = calculateGrundavdrag(income); // both tier 5: 17400
    const ga2 = calculateGrundavdrag(income2);
    const jsa1 = calculateJobbskatteavdrag(income, ga1, rate);
    const jsa2 = calculateJobbskatteavdrag(income2, ga2, rate);
    // Both should be the same (capped at 3.027*PBB - grundavdrag)*rate
    // Since grundavdrag is the same (17400), JSA should be identical
    assert.ok(Math.abs(jsa1 - jsa2) < 0.01);
  });
});

// ─── Municipal Tax ───────────────────────────────────────────────

describe('calculateMunicipalTax', () => {
  it('calculates correctly', () => {
    // 300000 - 34000 = 266000 * 0.3238 = 86130.80 → Math.round = 86131
    assert.equal(calculateMunicipalTax(300000, 34000, 0.3238), 86131);
  });

  it('floors at 0 for low income', () => {
    assert.equal(calculateMunicipalTax(10000, 25100, 0.3238), 0);
  });
});

// ─── Employment Income Reduction ─────────────────────────────────

describe('calculateEmploymentIncomeReduction', () => {
  it('returns 0 when taxable income <= 40000', () => {
    assert.equal(calculateEmploymentIncomeReduction(70000, 30000), 0); // 70000-30000 = 40000
  });

  it('returns proportional amount in middle range', () => {
    // taxable = 140000, grundavdrag picked to make taxable = 140000
    // 0.0075 * (140000 - 40000) = 0.0075 * 100000 = 750
    assert.equal(calculateEmploymentIncomeReduction(180000, 40000), 750);
  });

  it('returns max 1500 when taxable income > 240000', () => {
    assert.equal(calculateEmploymentIncomeReduction(300000, 34000), 1500); // 266000 > 240000
  });
});

// ─── State Tax ───────────────────────────────────────────────────

describe('calculateStateTax', () => {
  it('returns 0 below brytpunkt', () => {
    const result = calculateStateTax(600000);
    assert.equal(result.amount, 0);
    assert.equal(result.marginalRate, 0);
  });

  it('returns 0 at exactly brytpunkt', () => {
    const result = calculateStateTax(660400);
    assert.equal(result.amount, 0);
    assert.equal(result.marginalRate, 0);
  });

  it('returns 20% above brytpunkt', () => {
    const result = calculateStateTax(760400);
    // (760400 - 660400) * 0.20 = 100000 * 0.20 = 20000
    assert.equal(result.amount, 20000);
    assert.equal(result.marginalRate, 0.20);
  });
});

// ─── Burial Fee ──────────────────────────────────────────────────

describe('calculateBurialFee', () => {
  it('uses default rate for non-Stockholm', () => {
    // (300000 - 34000) * 0.00292 = 266000 * 0.00292 = 776.72
    const fee = calculateBurialFee(300000, 34000, 'Malmö');
    assert.ok(Math.abs(fee - 776.72) < 0.01);
  });

  it('uses Stockholm rate', () => {
    // (300000 - 17400) * 0.0007 = 282600 * 0.0007 = 197.82
    const fee = calculateBurialFee(300000, 17400, 'Stockholm');
    assert.ok(Math.abs(fee - 197.82) < 0.01);
  });

  it('floors at 0 for very low income', () => {
    const fee = calculateBurialFee(10000, 25100, 'Malmö');
    assert.equal(fee, 0);
  });
});

// ─── Pension Contribution ────────────────────────────────────────

describe('calculatePensionContribution', () => {
  it('returns 0 for income below minimum', () => {
    // minIncome = ceil(0.423*59200/100)*100 = 25100
    assert.equal(calculatePensionContribution(20000, 5000), 0);
  });

  it('returns 0 when pension < income tax', () => {
    // For moderate income, pension tends to be less than income tax
    // income=300000: pension = round((0.07*floor(300000/100)*100)/100)*100
    // = round((0.07*300000)/100)*100 = round(21000/100)*100 = round(210)*100 = 21000
    // If incomeTax = 52000, then pension (21000) < tax (52000) → 0
    assert.equal(calculatePensionContribution(300000, 52000), 0);
  });

  it('returns pension - incomeTax when pension >= incomeTax', () => {
    // Very low tax scenario with moderate income
    // income=100000: pension = round((0.07*100000)/100)*100 = round(70)*100 = 7000
    // If incomeTax = 3000, pension (7000) >= tax (3000) → 7000-3000 = 4000
    assert.equal(calculatePensionContribution(100000, 3000), 4000);
  });
});

// ─── Public Service Fee ──────────────────────────────────────────

describe('calculatePublicServiceFee', () => {
  it('returns rate-based fee below threshold', () => {
    // 1.42 * IBB = 1.42 * 83400 = 118428
    // income = 150000, grundavdrag = ~45600 (tier 3)
    // taxable = 150000 - 45600 = 104400 <= 118428
    // fee = 0.01 * 104400 = 1044
    const fee = calculatePublicServiceFee(150000, 45600);
    assert.ok(Math.abs(fee - 1044) < 0.01);
  });

  it('returns max 1184 above threshold', () => {
    // income = 300000, grundavdrag = 34000
    // taxable = 266000 > 118428
    const fee = calculatePublicServiceFee(300000, 34000);
    assert.equal(fee, 1184);
  });

  it('returns 0 when taxable income <= 0', () => {
    assert.equal(calculatePublicServiceFee(10000, 25100), 0);
  });
});

// ─── Regional Reduction Eligibility ──────────────────────────────

describe('isRegionalReductionEligible', () => {
  it('returns true for qualifying municipality', () => {
    assert.equal(isRegionalReductionEligible('Kiruna'), true);
    assert.equal(isRegionalReductionEligible('Åsele'), true);
    assert.equal(isRegionalReductionEligible('Bollnäs'), true);
  });

  it('returns false for non-qualifying municipality', () => {
    assert.equal(isRegionalReductionEligible('Stockholm'), false);
    assert.equal(isRegionalReductionEligible('Malmö'), false);
    assert.equal(isRegionalReductionEligible('Riksgenomsnitt'), false);
  });

  it('returns true for Filipstad (bug fix: was "Filipstads" in original)', () => {
    assert.equal(isRegionalReductionEligible('Filipstad'), true);
    assert.equal(isRegionalReductionEligible('Filipstads'), false);
  });
});

// ─── Full Tax Breakdown (Integration Tests) ──────────────────────

describe('calculateTaxBreakdown', () => {
  it('returns null for zero income', () => {
    const result = calculateTaxBreakdown({
      monthlySalary: 0,
      municipalTaxRate: 32.38,
      municipalityName: 'Riksgenomsnitt',
    });
    assert.equal(result, null);
  });

  it('baseline: 25000 kr/mo, Riksgenomsnitt', () => {
    const result = calculateTaxBreakdown({
      monthlySalary: 25000,
      municipalTaxRate: 32.38,
      municipalityName: 'Riksgenomsnitt',
    });

    assert.equal(result.annualIncome, 300000);
    assert.equal(result.grundavdrag, 34000);
    assert.equal(result.stateTax, 0);
    assert.ok(result.jobbskatteavdrag > 0);
    assert.ok(result.municipalTax > 0);
    assert.equal(result.employmentIncomeReduction, 1500);
    assert.equal(result.regionalReduction, 0);
    assert.ok(result.netAnnualIncome > 0);
    assert.ok(result.totalTax > 0);
    assert.ok(result.averageTaxRate > 0 && result.averageTaxRate < 1);
  });

  it('Stockholm: 35000 kr/mo, special burial fee', () => {
    const result = calculateTaxBreakdown({
      monthlySalary: 35000,
      municipalTaxRate: 30.55,
      municipalityName: 'Stockholm',
    });

    // Stockholm should have lower burial fee
    const nonStockholm = calculateTaxBreakdown({
      monthlySalary: 35000,
      municipalTaxRate: 30.55,
      municipalityName: 'Riksgenomsnitt',
    });

    assert.ok(result.burialFee < nonStockholm.burialFee);
  });

  it('Kiruna: regional reduction applies', () => {
    const result = calculateTaxBreakdown({
      monthlySalary: 50000,
      municipalTaxRate: 34.39,
      municipalityName: 'Kiruna',
    });

    assert.equal(result.regionalReduction, 1675);
  });

  it('high income: state tax kicks in above brytpunkt', () => {
    const result = calculateTaxBreakdown({
      monthlySalary: 60000,
      municipalTaxRate: 32.38,
      municipalityName: 'Riksgenomsnitt',
    });

    // 60000 * 12 = 720000 > 660400
    assert.ok(result.stateTax > 0);
    assert.ok(Math.abs(result.stateTax - (720000 - 660400) * 0.2) < 0.01);
  });

  it('very high income: 100000 kr/mo', () => {
    const result = calculateTaxBreakdown({
      monthlySalary: 100000,
      municipalTaxRate: 32.42,
      municipalityName: 'Malmö',
    });

    assert.equal(result.annualIncome, 1200000);
    assert.ok(result.stateTax > 0);
    assert.ok(result.totalTax > 0);
    assert.ok(result.averageTaxRate > 0.5); // High income = high average tax
  });

  it('low income: 5000 kr/mo', () => {
    const result = calculateTaxBreakdown({
      monthlySalary: 5000,
      municipalTaxRate: 32.38,
      municipalityName: 'Riksgenomsnitt',
    });

    assert.equal(result.annualIncome, 60000);
    assert.equal(result.stateTax, 0);
    assert.ok(result.grundavdrag > 0);
    assert.ok(result.netAnnualIncome > 0);
  });

  it('all breakdown values are numbers', () => {
    const result = calculateTaxBreakdown({
      monthlySalary: 30000,
      municipalTaxRate: 32.38,
      municipalityName: 'Riksgenomsnitt',
    });

    for (const [key, value] of Object.entries(result)) {
      assert.equal(typeof value, 'number', `${key} should be a number`);
    }
  });

  it('no regional reduction for non-qualifying municipality', () => {
    const result = calculateTaxBreakdown({
      monthlySalary: 30000,
      municipalTaxRate: 32.42,
      municipalityName: 'Malmö',
    });

    assert.equal(result.regionalReduction, 0);
  });

  it('employer cost = salary + employer contribution', () => {
    const result = calculateTaxBreakdown({
      monthlySalary: 40000,
      municipalTaxRate: 32.38,
      municipalityName: 'Riksgenomsnitt',
    });

    assert.ok(
      Math.abs(result.totalEmployerCost - (result.annualIncome + result.employerContribution)) < 0.01
    );
  });
});
