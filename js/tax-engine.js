import {
  TAX_YEAR_2026,
  GRUNDAVDRAG_BRACKETS,
  JOBBSKATTEAVDRAG_BRACKETS,
  REGIONAL_REDUCTION_MUNICIPALITIES,
} from './constants.js';

/**
 * Get tax year config. Currently only 2026 is supported.
 * @param {number} [taxYear=2026]
 * @returns {object}
 */
function getConfig(taxYear = 2026) {
  if (taxYear !== 2026) {
    throw new Error(`Tax year ${taxYear} is not supported`);
  }
  return TAX_YEAR_2026;
}

/**
 * Calculate grundavdrag (basic deduction).
 * 5-tier bracket system, result rounded up to nearest 100.
 * @param {number} annualIncome - Gross annual income in SEK
 * @param {number} [taxYear=2026]
 * @returns {number} Grundavdrag in SEK
 */
export function calculateGrundavdrag(annualIncome, taxYear = 2026) {
  const config = getConfig(taxYear);
  const { PBB } = config;

  if (annualIncome <= 0) return 0;

  for (const bracket of GRUNDAVDRAG_BRACKETS) {
    const min = bracket.minPBB * PBB;
    const max = bracket.maxPBB * PBB;

    if (annualIncome >= min && (annualIncome < max || bracket.maxPBB === Infinity)) {
      if (bracket.coefficient !== undefined) {
        return Math.ceil((bracket.coefficient * PBB) / 100) * 100;
      }
      return Math.ceil((bracket.baseCoefficient * PBB + bracket.incomeCoefficient * annualIncome) / 100) * 100;
    }
  }

  return 0;
}

/**
 * Calculate jobbskatteavdrag (employment tax credit).
 * 4-tier bracket system.
 * @param {number} annualIncome - Gross annual income in SEK
 * @param {number} grundavdrag - Basic deduction in SEK
 * @param {number} municipalTaxRate - Municipal tax rate as decimal (e.g. 0.3238)
 * @param {number} [taxYear=2026]
 * @returns {number} Jobbskatteavdrag in SEK
 */
export function calculateJobbskatteavdrag(annualIncome, grundavdrag, municipalTaxRate, taxYear = 2026) {
  const config = getConfig(taxYear);
  const { PBB } = config;

  if (annualIncome <= 0) return 0;

  let jsa = 0;

  if (annualIncome < 0.91 * PBB) {
    // Tier 1: linear
    jsa = (annualIncome - grundavdrag) * municipalTaxRate;
    return Math.max(0, jsa);
  } else if (annualIncome < 3.24 * PBB) {
    // Tier 2
    jsa = (0.91 * PBB + 0.3874 * (annualIncome - 0.91 * PBB) - grundavdrag) * municipalTaxRate;
  } else if (annualIncome < 8.08 * PBB) {
    // Tier 3
    jsa = (1.813 * PBB + 0.251 * (annualIncome - 3.24 * PBB) - grundavdrag) * municipalTaxRate;
  } else {
    // Tier 4: capped
    jsa = (3.027 * PBB - grundavdrag) * municipalTaxRate;
  }

  return jsa;
}

/**
 * Calculate municipal tax (kommunalskatt) before JSA.
 * @param {number} annualIncome
 * @param {number} grundavdrag
 * @param {number} municipalTaxRate - As decimal (e.g. 0.3238)
 * @returns {number} Municipal tax in SEK
 */
export function calculateMunicipalTax(annualIncome, grundavdrag, municipalTaxRate) {
  return Math.max(0, Math.round((annualIncome - grundavdrag) * municipalTaxRate));
}

/**
 * Calculate skattereduktion för förvärvsinkomst (employment income reduction).
 * 3-tier system with max 1500 SEK.
 * @param {number} annualIncome
 * @param {number} grundavdrag
 * @param {number} [taxYear=2026]
 * @returns {number} Reduction in SEK
 */
export function calculateEmploymentIncomeReduction(annualIncome, grundavdrag, taxYear = 2026) {
  const config = getConfig(taxYear);
  const { LOWER, UPPER, RATE, MAX } = config.EMPLOYMENT_INCOME_REDUCTION;
  const taxableIncome = annualIncome - grundavdrag;

  if (taxableIncome <= LOWER) {
    return 0;
  } else if (taxableIncome <= UPPER) {
    return RATE * (taxableIncome - LOWER);
  }
  return MAX;
}

/**
 * Calculate statlig inkomstskatt (state income tax).
 * 20% on income above brytpunkt.
 * @param {number} annualIncome
 * @param {number} [taxYear=2026]
 * @returns {{ amount: number, marginalRate: number }}
 */
export function calculateStateTax(annualIncome, taxYear = 2026) {
  const config = getConfig(taxYear);
  const { BRYTPUNKT, STATE_TAX_RATE } = config;

  if (annualIncome > BRYTPUNKT) {
    return {
      amount: (annualIncome - BRYTPUNKT) * STATE_TAX_RATE,
      marginalRate: STATE_TAX_RATE,
    };
  }
  return { amount: 0, marginalRate: 0 };
}

/**
 * Calculate begravningsavgift (burial fee).
 * Stockholm has a special lower rate.
 * @param {number} annualIncome
 * @param {number} grundavdrag
 * @param {string} municipalityName
 * @param {number} [taxYear=2026]
 * @returns {number} Burial fee in SEK
 */
export function calculateBurialFee(annualIncome, grundavdrag, municipalityName, taxYear = 2026) {
  const config = getConfig(taxYear);
  const rate = municipalityName === 'Stockholm'
    ? config.BURIAL_FEE_STOCKHOLM
    : config.BURIAL_FEE_DEFAULT;
  return Math.max(0, (annualIncome - grundavdrag) * rate);
}

/**
 * Calculate allmän pensionsavgift (general pension contribution).
 * Complex rounding: floor income to 100, compute 7%, round to 100,
 * then offset by income tax (if pension > tax, pension = pension - tax, else 0).
 * @param {number} annualIncome
 * @param {number} incomeTax - The computed income tax (skatt) before pension offset
 * @param {number} [taxYear=2026]
 * @returns {number} Pension contribution in SEK
 */
export function calculatePensionContribution(annualIncome, incomeTax, taxYear = 2026) {
  const config = getConfig(taxYear);
  const { PBB, PENSION_RATE } = config;
  const minIncome = Math.ceil((0.423 * PBB) / 100) * 100;

  if (annualIncome < minIncome) return 0;

  const pension = Math.round((PENSION_RATE * Math.floor(annualIncome / 100) * 100) / 100) * 100;

  if (pension < incomeTax) return 0;
  return pension - incomeTax;
}

/**
 * Calculate public service-avgift.
 * Capped at 1184 SEK for income above 1.42 * IBB threshold.
 * @param {number} annualIncome
 * @param {number} grundavdrag
 * @param {number} [taxYear=2026]
 * @returns {number} Public service fee in SEK
 */
export function calculatePublicServiceFee(annualIncome, grundavdrag, taxYear = 2026) {
  const config = getConfig(taxYear);
  const { IBB, PUBLIC_SERVICE_RATE, PUBLIC_SERVICE_MAX, PUBLIC_SERVICE_THRESHOLD_MULTIPLIER } = config;
  const taxableIncome = annualIncome - grundavdrag;

  if (taxableIncome <= 0) return 0;

  if (taxableIncome <= PUBLIC_SERVICE_THRESHOLD_MULTIPLIER * IBB) {
    return Math.max(0, PUBLIC_SERVICE_RATE * taxableIncome);
  }
  return PUBLIC_SERVICE_MAX;
}

/**
 * Check if a municipality qualifies for regional residence tax reduction.
 * @param {string} municipalityName
 * @returns {boolean}
 */
export function isRegionalReductionEligible(municipalityName) {
  return REGIONAL_REDUCTION_MUNICIPALITIES.has(municipalityName);
}

/**
 * Calculate complete tax breakdown for a given income and municipality.
 * This is the main orchestrator function replacing the original `raknaut()`.
 *
 * @param {object} input
 * @param {number} input.monthlySalary - Monthly salary in SEK
 * @param {number} input.municipalTaxRate - Municipal tax rate as percentage (e.g. 32.38)
 * @param {string} input.municipalityName - Municipality name
 * @param {number} [taxYear=2026]
 * @returns {object} Full tax breakdown with all components
 */
export function calculateTaxBreakdown(input, taxYear = 2026) {
  const config = getConfig(taxYear);
  const { AGA, WEIGHTED_VAT, REGIONAL_REDUCTION_AMOUNT } = config;

  const annualIncome = input.monthlySalary * 12;
  const municipalTaxRate = input.municipalTaxRate / 100;

  if (annualIncome <= 0) {
    return null;
  }

  const grundavdrag = calculateGrundavdrag(annualIncome, taxYear);
  const jobbskatteavdrag = calculateJobbskatteavdrag(annualIncome, grundavdrag, municipalTaxRate, taxYear);
  const municipalTax = calculateMunicipalTax(annualIncome, grundavdrag, municipalTaxRate);
  const employmentIncomeReduction = calculateEmploymentIncomeReduction(annualIncome, grundavdrag, taxYear);
  const stateTax = calculateStateTax(annualIncome, taxYear);
  const burialFee = calculateBurialFee(annualIncome, grundavdrag, input.municipalityName, taxYear);
  const publicServiceFee = calculatePublicServiceFee(annualIncome, grundavdrag, taxYear);

  // Regional reduction: computed synchronously (fixes original localStorage bug)
  const regionalReductionEligible = isRegionalReductionEligible(input.municipalityName);
  const regionalReduction = regionalReductionEligible ? REGIONAL_REDUCTION_AMOUNT : 0;

  // Income tax (skatt): municipal tax - JSA - employment reduction + state tax
  const incomeTax = Math.max(0, Math.round(municipalTax - jobbskatteavdrag - employmentIncomeReduction + stateTax.amount));

  // Pension contribution (depends on income tax)
  const pensionContribution = calculatePensionContribution(annualIncome, incomeTax, taxYear);

  // Net income after tax
  const netAnnualIncome = Math.round(
    annualIncome - incomeTax - pensionContribution - burialFee - publicServiceFee + regionalReduction
  );

  // Employer costs
  const employerContribution = annualIncome * AGA;
  const totalEmployerCost = annualIncome + employerContribution;

  // VAT and total tax
  const vat = WEIGHTED_VAT * netAnnualIncome;

  // Marginal tax rate
  const marginalStateTaxRate = stateTax.marginalRate;
  const totalMarginalTaxRate =
    (marginalStateTaxRate + (1 - marginalStateTaxRate) * WEIGHTED_VAT + AGA) / (1 + AGA);

  // Total tax burden
  const totalTax = vat + employerContribution + incomeTax + pensionContribution + burialFee + publicServiceFee - regionalReduction;
  const averageTaxRate = totalTax / totalEmployerCost;

  return {
    annualIncome,
    grundavdrag,
    jobbskatteavdrag,
    municipalTax,
    employmentIncomeReduction,
    stateTax: stateTax.amount,
    burialFee,
    pensionContribution,
    publicServiceFee,
    regionalReduction,
    incomeTax,
    netAnnualIncome,
    employerContribution,
    totalEmployerCost,
    vat,
    totalMarginalTaxRate,
    totalTax,
    averageTaxRate,
  };
}
