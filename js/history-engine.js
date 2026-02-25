import {
  lowerbracket, upperbracket, muntax, PBB, vatrate, CPI,
} from '../data/historik.js?v=0.9999';

function ceil100(v) {
  return Math.ceil(v / 100) * 100;
}

function floor100(v) {
  return Math.floor(v / 100) * 100;
}

function calcbasicdeduction(income, year) {
  const index = year - 1971;
  let basicdeduction = 0;

  if (year >= 1971 && year <= 1974) {
    if (income >= 0 && income < 4500)
      basicdeduction = income;
    else if (income >= 4500 && income < 30000)
      basicdeduction = 4500;
    else if (income >= 30000 && income < 52500)
      basicdeduction = 4500 - 0.2 * (income - 30000);
    else if (income >= 52500)
      basicdeduction = 0;
  } else if (year >= 1975 && year <= 1979) {
    if (income >= 0 && income < 4500)
      basicdeduction = income;
    else if (income >= 4500)
      basicdeduction = 4500;
  } else if (year >= 1980 && year <= 1981) {
    if (income >= 0 && income < 6000)
      basicdeduction = income;
    else if (income >= 6000)
      basicdeduction = 6000;
  } else if (year >= 1982 && year <= 1986) {
    if (income >= 0 && income < 7500)
      basicdeduction = income;
    else if (income >= 7500)
      basicdeduction = 7500;
  } else if (year === 1987) {
    if (income >= 0 && income < 9000)
      basicdeduction = income;
    else if (income >= 9000)
      basicdeduction = 9000;
  } else if (year >= 1988 && year <= 1990) {
    if (income >= 0 && income < 10000)
      basicdeduction = income;
    else if (income >= 10000)
      basicdeduction = 10000;
  } else if (year >= 1991 && year <= 1993) {
    if (income >= 0 && income < floor100(0.32 * PBB[index]))
      basicdeduction = income;
    else if (income >= floor100(0.32 * PBB[index]) && income < 1.86 * PBB[index])
      basicdeduction = floor100(0.32 * PBB[index]);
    else if (income >= 1.86 * PBB[index] && income < 2.89 * PBB[index])
      basicdeduction = floor100(0.32 * PBB[index] + 0.25 * (income - 1.86 * PBB[index]));
    else if (income >= 2.89 * PBB[index] && income < 3.04 * PBB[index])
      basicdeduction = floor100(0.5775 * PBB[index]);
    else if (income >= 3.04 * PBB[index] && income < 5.615 * PBB[index])
      basicdeduction = floor100(0.5775 * PBB[index] - 0.1 * (income - 3.04 * PBB[index]));
    else if (income >= 5.615 * PBB[index])
      basicdeduction = floor100(0.32 * PBB[index]);
  } else if (year >= 1994 && year <= 1995) {
    if (income >= 0 && income < floor100(0.25 * PBB[index]))
      basicdeduction = income;
    else if (income >= floor100(0.25 * PBB[index]) && income < 1.86 * PBB[index])
      basicdeduction = floor100(0.25 * PBB[index]);
    else if (income >= 1.86 * PBB[index] && income < 2.89 * PBB[index])
      basicdeduction = floor100(0.25 * PBB[index] + 0.25 * (income - 1.86 * PBB[index]));
    else if (income >= 2.89 * PBB[index] && income < 3.04 * PBB[index])
      basicdeduction = floor100(0.5075 * PBB[index]);
    else if (income >= 3.04 * PBB[index] && income < 5.615 * PBB[index])
      basicdeduction = floor100(0.5075 * PBB[index] - 0.1 * (income - 3.04 * PBB[index]));
    else if (income >= 5.615 * PBB[index])
      basicdeduction = floor100(0.25 * PBB[index]);
  } else if (year >= 1996 && year <= 2000) {
    if (income >= 0 && income < floor100(0.24 * PBB[index]))
      basicdeduction = income;
    else if (income >= floor100(0.24 * PBB[index]) && income < 1.86 * PBB[index])
      basicdeduction = floor100(0.24 * PBB[index]);
    else if (income >= 1.86 * PBB[index] && income < 2.89 * PBB[index])
      basicdeduction = floor100(0.24 * PBB[index] + 0.25 * (income - 1.86 * PBB[index]));
    else if (income >= 2.89 * PBB[index] && income < 3.04 * PBB[index])
      basicdeduction = floor100(0.4975 * PBB[index]);
    else if (income >= 3.04 * PBB[index] && income < 5.615 * PBB[index])
      basicdeduction = floor100(0.4975 * PBB[index] - 0.1 * (income - 3.04 * PBB[index]));
    else if (income >= 5.615 * PBB[index])
      basicdeduction = floor100(0.24 * PBB[index]);
  } else if (year === 2001) {
    if (income >= 0 && income < ceil100(0.27 * PBB[index]))
      basicdeduction = income;
    else if (income >= ceil100(0.27 * PBB[index]) && income < 1.86 * PBB[index])
      basicdeduction = ceil100(0.27 * PBB[index]);
    else if (income >= 1.86 * PBB[index] && income < 2.89 * PBB[index])
      basicdeduction = ceil100(0.27 * PBB[index] + 0.25 * (income - 1.86 * PBB[index]));
    else if (income >= 2.89 * PBB[index] && income < 3.04 * PBB[index])
      basicdeduction = ceil100(0.5275 * PBB[index]);
    else if (income >= 3.04 * PBB[index] && income < 5.615 * PBB[index])
      basicdeduction = ceil100(0.5275 * PBB[index] - 0.1 * (income - 3.04 * PBB[index]));
    else if (income >= 5.615 * PBB[index])
      basicdeduction = ceil100(0.27 * PBB[index]);
  } else if (year === 2002) {
    if (income >= 0 && income < ceil100(0.293 * PBB[index]))
      basicdeduction = income;
    else if (income >= ceil100(0.293 * PBB[index]) && income < 1.86 * PBB[index])
      basicdeduction = ceil100(0.293 * PBB[index]);
    else if (income >= 1.86 * PBB[index] && income < 2.89 * PBB[index])
      basicdeduction = ceil100(0.293 * PBB[index] + 0.25 * (income - 1.86 * PBB[index]));
    else if (income >= 2.89 * PBB[index] && income < 3.04 * PBB[index])
      basicdeduction = ceil100(0.5505 * PBB[index]);
    else if (income >= 3.04 * PBB[index] && income < 5.615 * PBB[index])
      basicdeduction = ceil100(0.5505 * PBB[index] - 0.1 * (income - 3.04 * PBB[index]));
    else if (income >= 5.615 * PBB[index])
      basicdeduction = ceil100(0.293 * PBB[index]);
  } else if (year === 2003 || year === 2004) {
    if (income >= 0 && income < ceil100(0.423 * PBB[index]))
      basicdeduction = income;
    else if (income >= ceil100(0.423 * PBB[index]) && income < 1.49 * PBB[index])
      basicdeduction = ceil100(0.423 * PBB[index]);
    else if (income >= 1.49 * PBB[index] && income < 2.72 * PBB[index])
      basicdeduction = ceil100(0.423 * PBB[index] + 0.2 * (income - 1.49 * PBB[index]));
    else if (income >= 2.72 * PBB[index] && income < 3.1 * PBB[index])
      basicdeduction = ceil100(0.67 * PBB[index]);
    else if (income >= 3.1 * PBB[index] && income < 6.87 * PBB[index])
      basicdeduction = ceil100(0.67 * PBB[index] - 0.1 * (income - 3.1 * PBB[index]));
    else if (income >= 6.87 * PBB[index])
      basicdeduction = ceil100(0.293 * PBB[index]);
  } else if (year === 2005) {
    if (income >= 0 && income < ceil100(0.423 * PBB[index]))
      basicdeduction = income;
    else if (income >= ceil100(0.423 * PBB[index]) && income < 1.185 * PBB[index])
      basicdeduction = ceil100(0.423 * PBB[index]);
    else if (income >= 1.185 * PBB[index] && income < 2.72 * PBB[index])
      basicdeduction = ceil100(0.423 * PBB[index] + 0.2 * (income - 1.185 * PBB[index]));
    else if (income >= 2.72 * PBB[index] && income < 3.11 * PBB[index])
      basicdeduction = ceil100(0.73 * PBB[index]);
    else if (income >= 3.11 * PBB[index] && income < 7.48 * PBB[index])
      basicdeduction = ceil100(0.73 * PBB[index] - 0.1 * (income - 3.11 * PBB[index]));
    else if (income >= 7.48 * PBB[index])
      basicdeduction = ceil100(0.293 * PBB[index]);
  } else if (year >= 2006) {
    if (income >= 0 && income < ceil100(0.423 * PBB[index]))
      basicdeduction = income;
    else if (income >= ceil100(0.423 * PBB[index]) && income < 0.99 * PBB[index])
      basicdeduction = ceil100(0.423 * PBB[index]);
    else if (income >= 0.99 * PBB[index] && income < 2.72 * PBB[index])
      basicdeduction = ceil100(0.225 * PBB[index] + 0.2 * income);
    else if (income >= 2.72 * PBB[index] && income < 3.11 * PBB[index])
      basicdeduction = ceil100(0.770 * PBB[index]);
    else if (income >= 3.11 * PBB[index] && income < 7.88 * PBB[index])
      basicdeduction = ceil100(1.081 * PBB[index] - 0.1 * income);
    else if (income >= 7.88 * PBB[index])
      basicdeduction = ceil100(0.293 * PBB[index]);
  }

  return basicdeduction;
}

function calcextradeduction(income, year) {
  let extradeduction = 0;

  if (year >= 1983 && year <= 1985) {
    if (income <= 20000)
      extradeduction = income * 0.05;
    else
      extradeduction = 1000;
  } else if (year >= 1986 && year <= 1990) {
    if (income <= 30000)
      extradeduction = income * 0.1;
    else
      extradeduction = 3000;
  } else if (year >= 1991 && year <= 1992) {
    if (income <= 40000)
      extradeduction = income * 0.1;
    else
      extradeduction = 4000;
  }

  return extradeduction;
}

function calcEITC(income, year) {
  const index = year - 1971;
  let EITC = 0;

  if (year <= 2006) {
    EITC = 0;
  } else if (year === 2007) {
    if (income >= 0 && income < 0.79 * PBB[index])
      EITC = (income - calcbasicdeduction(income, year)) * muntax[index];
    else if (income >= 0.79 * PBB[index] && income < 2.72 * PBB[index])
      EITC = (0.79 * PBB[index] + 0.2 * (income - 0.79 * PBB[index]) - calcbasicdeduction(income, year)) * muntax[index];
    else if (income >= 2.72 * PBB[index])
      EITC = (1.176 * PBB[index] - calcbasicdeduction(income, year)) * muntax[index];
  } else if (year === 2008) {
    if (income >= 0 && income < 0.91 * PBB[index])
      EITC = (income - calcbasicdeduction(income, year)) * muntax[index];
    else if (income >= 0.91 * PBB[index] && income < 2.72 * PBB[index])
      EITC = (0.91 * PBB[index] + 0.2 * (income - 0.91 * PBB[index]) - calcbasicdeduction(income, year)) * muntax[index];
    else if (income >= 2.72 * PBB[index] && income < 7 * PBB[index])
      EITC = (1.272 * PBB[index] + 0.033 * (income - 2.72 * PBB[index]) - calcbasicdeduction(income, year)) * muntax[index];
    else if (income >= 7 * PBB[index])
      EITC = (1.413 * PBB[index] - calcbasicdeduction(income, year)) * muntax[index];
  } else if (year === 2009) {
    if (income >= 0 && income < 0.91 * PBB[index])
      EITC = (income - calcbasicdeduction(income, year)) * muntax[index];
    else if (income >= 0.91 * PBB[index] && income < 2.72 * PBB[index])
      EITC = (0.91 * PBB[index] + 0.25 * (income - 0.91 * PBB[index]) - calcbasicdeduction(income, year)) * muntax[index];
    else if (income >= 2.72 * PBB[index] && income < 7 * PBB[index])
      EITC = (1.363 * PBB[index] + 0.065 * (income - 2.72 * PBB[index]) - calcbasicdeduction(income, year)) * muntax[index];
    else if (income >= 7 * PBB[index])
      EITC = (1.642 * PBB[index] - calcbasicdeduction(income, year)) * muntax[index];
  } else if (year >= 2010 && year <= 2013) {
    if (income >= 0 && income < 0.91 * PBB[index])
      EITC = (income - calcbasicdeduction(income, year)) * muntax[index];
    else if (income >= 0.91 * PBB[index] && income < 2.72 * PBB[index])
      EITC = (0.91 * PBB[index] + 0.304 * (income - 0.91 * PBB[index]) - calcbasicdeduction(income, year)) * muntax[index];
    else if (income >= 2.72 * PBB[index] && income < 7 * PBB[index])
      EITC = (1.461 * PBB[index] + 0.095 * (income - 2.72 * PBB[index]) - calcbasicdeduction(income, year)) * muntax[index];
    else if (income >= 7 * PBB[index])
      EITC = (1.868 * PBB[index] - calcbasicdeduction(income, year)) * muntax[index];
  } else if (year >= 2014 && year <= 2015) {
    if (income >= 0 && income < 0.91 * PBB[index])
      EITC = (income - calcbasicdeduction(income, year)) * muntax[index];
    else if (income >= 0.91 * PBB[index] && income < 2.94 * PBB[index])
      EITC = (0.91 * PBB[index] + 0.332 * (income - 0.91 * PBB[index]) - calcbasicdeduction(income, year)) * muntax[index];
    else if (income >= 2.94 * PBB[index] && income < 8.08 * PBB[index])
      EITC = (1.584 * PBB[index] + 0.111 * (income - 2.94 * PBB[index]) - calcbasicdeduction(income, year)) * muntax[index];
    else if (income >= 8.08 * PBB[index])
      EITC = (2.155 * PBB[index] - calcbasicdeduction(income, year)) * muntax[index];
  } else if (year >= 2016 && year <= 2018) {
    if (income >= 0 && income < 0.91 * PBB[index])
      EITC = (income - calcbasicdeduction(income, year)) * muntax[index];
    else if (income >= 0.91 * PBB[index] && income < 2.94 * PBB[index])
      EITC = (0.91 * PBB[index] + 0.332 * (income - 0.91 * PBB[index]) - calcbasicdeduction(income, year)) * muntax[index];
    else if (income >= 2.94 * PBB[index] && income < 8.08 * PBB[index])
      EITC = (1.584 * PBB[index] + 0.111 * (income - 2.94 * PBB[index]) - calcbasicdeduction(income, year)) * muntax[index];
    else if (income >= 8.08 * PBB[index] && income < 13.54 * PBB[index])
      EITC = (2.155 * PBB[index] - calcbasicdeduction(income, year)) * muntax[index];
    else if (income >= 13.54 * PBB[index])
      EITC = Math.max(0, (2.155 * PBB[index] - calcbasicdeduction(income, year)) * muntax[index] - 0.03 * (income - 13.54 * PBB[index]));
  } else if (year >= 2019) {
    if (income >= 0 && income < 0.91 * PBB[index])
      EITC = (income - calcbasicdeduction(income, year)) * muntax[index];
    else if (income >= 0.91 * PBB[index] && income < 3.24 * PBB[index])
      EITC = (0.91 * PBB[index] + 0.3405 * (income - 0.91 * PBB[index]) - calcbasicdeduction(income, year)) * muntax[index];
    else if (income >= 3.24 * PBB[index] && income < 8.08 * PBB[index])
      EITC = (1.703 * PBB[index] + 0.128 * (income - 3.24 * PBB[index]) - calcbasicdeduction(income, year)) * muntax[index];
    else if (income >= 8.08 * PBB[index] && income < 13.54 * PBB[index])
      EITC = (2.323 * PBB[index] - calcbasicdeduction(income, year)) * muntax[index];
    else if (income >= 13.54 * PBB[index])
      EITC = Math.max(0, (2.323 * PBB[index] - calcbasicdeduction(income, year)) * muntax[index] - 0.03 * (income - 13.54 * PBB[index]));
  }

  return EITC;
}

function calcworkerscontrib(income, year) {
  let workerscontrib = 0;

  if (year === 1971) {
    if (income >= 0 && income < 1800) workerscontrib = 0;
    else if (income >= 1800 && income < 2600) workerscontrib = 255;
    else if (income >= 2600 && income < 3400) workerscontrib = 260;
    else if (income >= 3400 && income < 4200) workerscontrib = 265;
    else if (income >= 4200 && income < 5000) workerscontrib = 275;
    else if (income >= 5000 && income < 5800) workerscontrib = 280;
    else if (income >= 5800 && income < 6800) workerscontrib = 285;
    else if (income >= 6800 && income < 8400) workerscontrib = 305;
    else if (income >= 8400 && income < 10200) workerscontrib = 320;
    else if (income >= 10200 && income < 12000) workerscontrib = 340;
    else if (income >= 12000 && income < 14000) workerscontrib = 360;
    else if (income >= 14000 && income < 16000) workerscontrib = 380;
    else if (income >= 16000 && income < 18000) workerscontrib = 400;
    else if (income >= 18000 && income < 21000) workerscontrib = 420;
    else if (income >= 21000 && income < 24000) workerscontrib = 440;
    else if (income >= 24000 && income < 27000) workerscontrib = 460;
    else if (income >= 27000 && income < 30000) workerscontrib = 480;
    else if (income >= 30000 && income < 33000) workerscontrib = 500;
    else if (income >= 33000 && income < 36000) workerscontrib = 520;
    else if (income >= 36000 && income < 39000) workerscontrib = 540;
    else if (income >= 39000) workerscontrib = 560;
  } else if (year === 1972) {
    if (income >= 0 && income < 1800) workerscontrib = 0;
    else if (income >= 1800 && income < 2600) workerscontrib = 295;
    else if (income >= 2600 && income < 3400) workerscontrib = 300;
    else if (income >= 3400 && income < 4200) workerscontrib = 305;
    else if (income >= 4200 && income < 5000) workerscontrib = 310;
    else if (income >= 5000 && income < 5800) workerscontrib = 320;
    else if (income >= 5800 && income < 6800) workerscontrib = 330;
    else if (income >= 6800 && income < 8400) workerscontrib = 345;
    else if (income >= 8400 && income < 10200) workerscontrib = 360;
    else if (income >= 10200 && income < 12000) workerscontrib = 380;
    else if (income >= 12000 && income < 14000) workerscontrib = 400;
    else if (income >= 14000 && income < 16000) workerscontrib = 420;
    else if (income >= 16000 && income < 18000) workerscontrib = 440;
    else if (income >= 18000 && income < 21000) workerscontrib = 460;
    else if (income >= 21000 && income < 24000) workerscontrib = 475;
    else if (income >= 24000 && income < 27000) workerscontrib = 495;
    else if (income >= 27000 && income < 30000) workerscontrib = 515;
    else if (income >= 30000 && income < 33000) workerscontrib = 535;
    else if (income >= 33000 && income < 36000) workerscontrib = 555;
    else if (income >= 36000 && income < 39000) workerscontrib = 575;
    else if (income >= 39000) workerscontrib = 595;
  } else if (year === 1973) {
    if (income >= 0 && income < 1800) workerscontrib = 0;
    else if (income >= 1800 && income < 2600) workerscontrib = 310;
    else if (income >= 2600 && income < 3400) workerscontrib = 320;
    else if (income >= 3400 && income < 4200) workerscontrib = 325;
    else if (income >= 4200 && income < 5000) workerscontrib = 335;
    else if (income >= 5000 && income < 5800) workerscontrib = 340;
    else if (income >= 5800 && income < 6800) workerscontrib = 355;
    else if (income >= 6800 && income < 8400) workerscontrib = 370;
    else if (income >= 8400 && income < 10200) workerscontrib = 385;
    else if (income >= 10200 && income < 12000) workerscontrib = 405;
    else if (income >= 12000 && income < 14000) workerscontrib = 425;
    else if (income >= 14000 && income < 16000) workerscontrib = 450;
    else if (income >= 16000 && income < 18000) workerscontrib = 470;
    else if (income >= 18000 && income < 21000) workerscontrib = 490;
    else if (income >= 21000 && income < 24000) workerscontrib = 515;
    else if (income >= 24000 && income < 27000) workerscontrib = 535;
    else if (income >= 27000 && income < 30000) workerscontrib = 555;
    else if (income >= 30000 && income < 33000) workerscontrib = 575;
    else if (income >= 33000 && income < 36000) workerscontrib = 600;
    else if (income >= 36000 && income < 39000) workerscontrib = 620;
    else if (income >= 39000) workerscontrib = 640;
  } else if (year === 1974) {
    if (income === 0)
      workerscontrib = 0;
    else if (income > 0 && income < 60750)
      workerscontrib = 300 + 0.016 * income;
    else if (income >= 60750)
      workerscontrib = 1272;
  } else if (year >= 1975 && year <= 1992) {
    workerscontrib = 0;
  } else if (year === 1993) {
    workerscontrib = Math.min(258000, income) * 0.0095;
  } else if (year === 1994) {
    workerscontrib = Math.min(264000, income) * 0.0195;
  } else if (year === 1995) {
    workerscontrib = Math.min(267750, income) * 0.0395;
  } else if (year === 1996) {
    workerscontrib = Math.min(271500, income) * 0.0495;
  } else if (year === 1997) {
    workerscontrib = Math.min(277500, income) * 0.0595;
  } else if (year === 1998) {
    workerscontrib = Math.min(278250, income) * 0.0695;
  } else if (year === 1999) {
    workerscontrib = Math.min(299832, income) * 0.0695;
  } else if (year === 2000) {
    workerscontrib = Math.min(301011, income) * 0.07 * 0.75;
  } else if (year === 2001) {
    workerscontrib = Math.min(304239, income) * 0.07 * 0.5;
  } else if (year === 2002) {
    workerscontrib = Math.min(313116, income) * 0.07 * 0.25;
  } else if (year === 2003) {
    workerscontrib = Math.min(330063, income) * 0.07 * 0.25;
  } else if (year === 2004) {
    workerscontrib = Math.min(341361, income) * 0.07 * 0.25;
  } else if (year === 2005) {
    workerscontrib = Math.min(349431, income) * 0.07 * 0.125;
  } else if (year >= 2006) {
    workerscontrib = 0;
  }

  return workerscontrib;
}

function calctaxcredit(income, year) {
  let taxcredit = 0;

  if (year >= 1975 && year <= 1977) {
    if (income <= 36000)
      taxcredit = 250;
    else if (income > 36000 && income <= 38500)
      taxcredit = 250 - 0.1 * (income - 36000);
    else if (income > 38500)
      taxcredit = 0;
  } else if (year === 1978) {
    taxcredit = 400;
  } else if (year === 1979) {
    taxcredit = 560;
  } else if (year === 1980) {
    if (income <= 40000)
      taxcredit = 320;
    else if (income > 40000 && income < 45000)
      taxcredit = 320 + 0.1 * (income - 40000);
    else if (income >= 45000 && income < 60000)
      taxcredit = 820;
    else if (income >= 60000 && income < 76600)
      taxcredit = 820 - 0.03 * (income - 60000);
    else if (income >= 76600)
      taxcredit = 320;
  } else if (year === 1981) {
    if (income <= 40000)
      taxcredit = 560;
    else if (income > 40000 && income < 45000)
      taxcredit = 560 + 0.1 * (income - 40000);
    else if (income >= 45000 && income < 60000)
      taxcredit = 1060;
    else if (income >= 60000 && income < 76600)
      taxcredit = 1060 - 0.03 * (income - 60000);
    else if (income >= 76600)
      taxcredit = 560;
  } else if (year === 1985) {
    if (income <= 20000)
      taxcredit = 0;
    else if (income > 20000 && income < 80000)
      taxcredit = 0.01 * (income - 20000);
    else if (income >= 80000)
      taxcredit = 600;
  }

  return taxcredit;
}

function calccentraltax(income, year) {
  const index = year - 1971;

  // Statligt grundavdrag (same as municipal basic deduction in some eras)
  if ((year >= 1971 && year <= 1979) || (year >= 1987 && year <= 1990)) {
    income = income - calcbasicdeduction(income, year);
  }

  let centraltax = 0;

  if (year >= 1971 && year <= 1972) {
    if (income > 0 && income <= 15000) centraltax = 0.1 * income;
    else if (income > 15000 && income <= 20000) centraltax = 1500 + 0.16 * (income - 15000);
    else if (income > 20000 && income <= 30000) centraltax = 2300 + 0.22 * (income - 20000);
    else if (income > 30000 && income <= 52500) centraltax = 4500 + 0.28 * (income - 30000);
    else if (income > 52500 && income <= 70000) centraltax = 10800 + 0.38 * (income - 52500);
    else if (income > 70000 && income <= 100000) centraltax = 17450 + 0.44 * (income - 70000);
    else if (income > 100000 && income <= 150000) centraltax = 30650 + 0.49 * (income - 100000);
    else if (income > 150000) centraltax = 55150 + 0.54 * (income - 150000);
  } else if (year >= 1973 && year <= 1974) {
    if (income > 0 && income <= 15000) centraltax = 0.07 * income;
    else if (income > 15000 && income <= 20000) centraltax = 1050 + 0.13 * (income - 15000);
    else if (income > 20000 && income <= 30000) centraltax = 1700 + 0.19 * (income - 20000);
    else if (income > 30000 && income <= 52500) centraltax = 3600 + 0.28 * (income - 30000);
    else if (income > 52500 && income <= 70000) centraltax = 9900 + 0.38 * (income - 52500);
    else if (income > 70000 && income <= 100000) centraltax = 16550 + 0.47 * (income - 70000);
    else if (income > 100000 && income <= 150000) centraltax = 30650 + 0.49 * (income - 100000);
    else if (income > 150000) centraltax = 55150 + 0.54 * (income - 150000);
  } else if (year === 1975) {
    if (income > 0 && income <= 15000) centraltax = 0.07 * income;
    else if (income > 15000 && income <= 20000) centraltax = 1050 + 0.12 * (income - 15000);
    else if (income > 20000 && income <= 25000) centraltax = 1650 + 0.17 * (income - 20000);
    else if (income > 25000 && income <= 30000) centraltax = 2500 + 0.22 * (income - 25000);
    else if (income > 30000 && income <= 40000) centraltax = 3600 + 0.28 * (income - 30000);
    else if (income > 40000 && income <= 45000) centraltax = 6400 + 0.33 * (income - 40000);
    else if (income > 45000 && income <= 65000) centraltax = 8050 + 0.38 * (income - 45000);
    else if (income > 65000 && income <= 70000) centraltax = 15650 + 0.43 * (income - 65000);
    else if (income > 70000 && income <= 100000) centraltax = 17800 + 0.48 * (income - 70000);
    else if (income > 100000 && income <= 150000) centraltax = 32200 + 0.52 * (income - 100000);
    else if (income > 150000) centraltax = 58200 + 0.56 * (income - 150000);
  } else if (year === 1976) {
    if (income > 0 && income <= 20000) centraltax = 0.04 * income;
    else if (income > 20000 && income <= 25000) centraltax = 800 + 0.1 * (income - 20000);
    else if (income > 25000 && income <= 30000) centraltax = 1300 + 0.2 * (income - 25000);
    else if (income > 30000 && income <= 35000) centraltax = 2300 + 0.22 * (income - 30000);
    else if (income > 35000 && income <= 40000) centraltax = 3400 + 0.28 * (income - 35000);
    else if (income > 40000 && income <= 45000) centraltax = 4800 + 0.33 * (income - 40000);
    else if (income > 45000 && income <= 65000) centraltax = 6450 + 0.38 * (income - 45000);
    else if (income > 65000 && income <= 70000) centraltax = 14050 + 0.43 * (income - 65000);
    else if (income > 70000 && income <= 80000) centraltax = 16200 + 0.48 * (income - 70000);
    else if (income > 80000 && income <= 100000) centraltax = 21000 + 0.49 * (income - 80000);
    else if (income > 100000 && income <= 150000) centraltax = 30800 + 0.53 * (income - 100000);
    else if (income > 150000) centraltax = 57300 + 0.57 * (income - 150000);
  } else if (year === 1977) {
    if (income > 0 && income <= 15000) centraltax = 0.02 * income;
    else if (income > 15000 && income <= 20000) centraltax = 300 + 0.04 * (income - 15000);
    else if (income > 20000 && income <= 25000) centraltax = 500 + 0.06 * (income - 20000);
    else if (income > 25000 && income <= 30000) centraltax = 800 + 0.1 * (income - 25000);
    else if (income > 30000 && income <= 35000) centraltax = 1300 + 0.15 * (income - 30000);
    else if (income > 35000 && income <= 40000) centraltax = 2050 + 0.21 * (income - 35000);
    else if (income > 40000 && income <= 45000) centraltax = 3100 + 0.26 * (income - 40000);
    else if (income > 45000 && income <= 50000) centraltax = 4400 + 0.35 * (income - 45000);
    else if (income > 50000 && income <= 55000) centraltax = 6150 + 0.36 * (income - 50000);
    else if (income > 55000 && income <= 60000) centraltax = 7950 + 0.37 * (income - 55000);
    else if (income > 60000 && income <= 65000) centraltax = 9800 + 0.38 * (income - 60000);
    else if (income > 65000 && income <= 70000) centraltax = 11700 + 0.43 * (income - 65000);
    else if (income > 70000 && income <= 80000) centraltax = 13850 + 0.48 * (income - 70000);
    else if (income > 80000 && income <= 100000) centraltax = 18650 + 0.49 * (income - 80000);
    else if (income > 100000 && income <= 150000) centraltax = 28450 + 0.53 * (income - 100000);
    else if (income > 150000) centraltax = 54950 + 0.58 * (income - 150000);
  } else if (year === 1978) {
    if (income > 0 && income <= 15000) centraltax = 0.02 * income;
    else if (income > 15000 && income <= 25000) centraltax = 300 + 0.04 * (income - 15000);
    else if (income > 25000 && income <= 30000) centraltax = 700 + 0.08 * (income - 25000);
    else if (income > 30000 && income <= 35000) centraltax = 1100 + 0.13 * (income - 30000);
    else if (income > 35000 && income <= 40000) centraltax = 1750 + 0.16 * (income - 35000);
    else if (income > 40000 && income <= 45000) centraltax = 2550 + 0.21 * (income - 40000);
    else if (income > 45000 && income <= 50000) centraltax = 3600 + 0.27 * (income - 45000);
    else if (income > 50000 && income <= 55000) centraltax = 4950 + 0.31 * (income - 50000);
    else if (income > 55000 && income <= 60000) centraltax = 6500 + 0.34 * (income - 55000);
    else if (income > 60000 && income <= 65000) centraltax = 8200 + 0.35 * (income - 60000);
    else if (income > 65000 && income <= 70000) centraltax = 9950 + 0.4 * (income - 65000);
    else if (income > 70000 && income <= 80000) centraltax = 11950 + 0.45 * (income - 70000);
    else if (income > 80000 && income <= 100000) centraltax = 16450 + 0.49 * (income - 80000);
    else if (income > 100000 && income <= 150000) centraltax = 26250 + 0.53 * (income - 100000);
    else if (income > 150000) centraltax = 52750 + 0.58 * (income - 150000);
  } else if (year === 1979) {
    if (income > 0 && income <= 16200) centraltax = 0.02 * income;
    else if (income > 16200 && income <= 27000) centraltax = 324 + 0.04 * (income - 16200);
    else if (income > 27000 && income <= 32400) centraltax = 756 + 0.08 * (income - 27000);
    else if (income > 32400 && income <= 37800) centraltax = 1188 + 0.13 * (income - 32400);
    else if (income > 37800 && income <= 43200) centraltax = 1890 + 0.16 * (income - 37800);
    else if (income > 43200 && income <= 48600) centraltax = 2754 + 0.2 * (income - 43200);
    else if (income > 48600 && income <= 54000) centraltax = 3834 + 0.25 * (income - 48600);
    else if (income > 54000 && income <= 59400) centraltax = 5184 + 0.29 * (income - 54000);
    else if (income > 59400 && income <= 64800) centraltax = 6750 + 0.33 * (income - 59400);
    else if (income > 64800 && income <= 70200) centraltax = 8532 + 0.35 * (income - 64800);
    else if (income > 70200 && income <= 75600) centraltax = 10422 + 0.4 * (income - 70200);
    else if (income > 75600 && income <= 86400) centraltax = 12582 + 0.45 * (income - 75600);
    else if (income > 86400 && income <= 108000) centraltax = 17442 + 0.49 * (income - 86400);
    else if (income > 108000 && income <= 162000) centraltax = 28026 + 0.53 * (income - 108000);
    else if (income > 162000) centraltax = 56646 + 0.58 * (income - 162000);
  } else if (year === 1980) {
    if (income > 0 && income <= 5800) centraltax = 0.01 * income;
    else if (income > 5800 && income <= 23200) centraltax = 58 + 0.02 * (income - 5800);
    else if (income > 23200 && income <= 29000) centraltax = 406 + 0.04 * (income - 23200);
    else if (income > 29000 && income <= 34800) centraltax = 638 + 0.05 * (income - 29000);
    else if (income > 34800 && income <= 40600) centraltax = 928 + 0.08 * (income - 34800);
    else if (income > 40600 && income <= 46400) centraltax = 1392 + 0.11 * (income - 40600);
    else if (income > 46400 && income <= 52200) centraltax = 2030 + 0.14 * (income - 46400);
    else if (income > 52200 && income <= 58000) centraltax = 2842 + 0.2 * (income - 52200);
    else if (income > 58000 && income <= 63800) centraltax = 4002 + 0.22 * (income - 58000);
    else if (income > 63800 && income <= 69600) centraltax = 5278 + 0.26 * (income - 63800);
    else if (income > 69600 && income <= 75400) centraltax = 6786 + 0.3 * (income - 69600);
    else if (income > 75400 && income <= 81200) centraltax = 8526 + 0.34 * (income - 75400);
    else if (income > 81200 && income <= 87000) centraltax = 10498 + 0.39 * (income - 81200);
    else if (income > 87000 && income <= 92800) centraltax = 12760 + 0.44 * (income - 87000);
    else if (income > 92800 && income <= 98600) centraltax = 15312 + 0.45 * (income - 92800);
    else if (income > 98600 && income <= 116000) centraltax = 17922 + 0.48 * (income - 98600);
    else if (income > 116000 && income <= 174000) centraltax = 26274 + 0.53 * (income - 116000);
    else if (income > 174000) centraltax = 57014 + 0.58 * (income - 174000);
  } else if (year === 1981) {
    if (income > 0 && income <= 6400) centraltax = 0.01 * income;
    else if (income > 6400 && income <= 25600) centraltax = 64 + 0.02 * (income - 6400);
    else if (income > 25600 && income <= 32000) centraltax = 448 + 0.04 * (income - 25600);
    else if (income > 32000 && income <= 38400) centraltax = 704 + 0.05 * (income - 32000);
    else if (income > 38400 && income <= 44800) centraltax = 1024 + 0.08 * (income - 38400);
    else if (income > 44800 && income <= 51200) centraltax = 1536 + 0.11 * (income - 44800);
    else if (income > 51200 && income <= 57600) centraltax = 2240 + 0.14 * (income - 51200);
    else if (income > 57600 && income <= 64000) centraltax = 3136 + 0.2 * (income - 57600);
    else if (income > 64000 && income <= 70400) centraltax = 4416 + 0.22 * (income - 64000);
    else if (income > 70400 && income <= 76800) centraltax = 5824 + 0.26 * (income - 70400);
    else if (income > 76800 && income <= 83200) centraltax = 7488 + 0.29 * (income - 76800);
    else if (income > 83200 && income <= 89600) centraltax = 9344 + 0.33 * (income - 83200);
    else if (income > 89600 && income <= 96000) centraltax = 11456 + 0.38 * (income - 89600);
    else if (income > 96000 && income <= 102400) centraltax = 13888 + 0.44 * (income - 96000);
    else if (income > 102400 && income <= 108800) centraltax = 16704 + 0.45 * (income - 102400);
    else if (income > 108800 && income <= 128000) centraltax = 19584 + 0.48 * (income - 108800);
    else if (income > 128000 && income <= 192000) centraltax = 28800 + 0.53 * (income - 128000);
    else if (income > 192000) centraltax = 62720 + 0.58 * (income - 192000);
  } else if (year === 1982) {
    if (income > 6900 && income <= 27600) centraltax = 0.02 * (income - 6900);
    else if (income > 27600 && income <= 48300) centraltax = 414 + 0.04 * (income - 27600);
    else if (income > 48300 && income <= 55200) centraltax = 1242 + 0.09 * (income - 48300);
    else if (income > 55200 && income <= 62100) centraltax = 1863 + 0.14 * (income - 55200);
    else if (income > 62100 && income <= 69000) centraltax = 2829 + 0.23 * (income - 62100);
    else if (income > 69000 && income <= 82800) centraltax = 4416 + 0.26 * (income - 69000);
    else if (income > 82800 && income <= 89700) centraltax = 8004 + 0.29 * (income - 82800);
    else if (income > 89700 && income <= 96600) centraltax = 10005 + 0.33 * (income - 89700);
    else if (income > 96600 && income <= 103500) centraltax = 12282 + 0.38 * (income - 96600);
    else if (income > 103500 && income <= 110400) centraltax = 14904 + 0.44 * (income - 103500);
    else if (income > 110400 && income <= 117300) centraltax = 17940 + Math.min(0.45, 0.8 - muntax[index]) * (income - 110400);
    else if (income > 117300 && income <= 138000) centraltax = 21045 + Math.min(0.48, 0.8 - muntax[index]) * (income - 117300);
    else if (income > 138000 && income <= 207000) centraltax = 30981 + Math.min(0.53, 0.85 - muntax[index]) * (income - 138000);
    else if (income > 207000) centraltax = 67551 + Math.min(0.58, 0.85 - muntax[index]) * (income - 207000);
  } else if (year === 1983) {
    if (income > 7300 && income <= 29200) centraltax = 0.03 * (income - 7300);
    else if (income > 29200 && income <= 51100) centraltax = 657 + 0.04 * (income - 29200);
    else if (income > 51100 && income <= 58400) centraltax = 1533 + 0.07 * (income - 51100);
    else if (income > 58400 && income <= 65700) centraltax = 2044 + 0.1 * (income - 58400);
    else if (income > 65700 && income <= 73000) centraltax = 2774 + 0.19 * (income - 65700);
    else if (income > 73000 && income <= 87600) centraltax = 4161 + 0.23 * (income - 73000);
    else if (income > 87600 && income <= 94900) centraltax = 7519 + 0.26 * (income - 87600);
    else if (income > 94900 && income <= 102200) centraltax = 9417 + 0.29 * (income - 94900);
    else if (income > 102200 && income <= 109500) centraltax = 11534 + 0.32 * (income - 102200);
    else if (income > 109500 && income <= 116800) centraltax = 13870 + 0.36 * (income - 109500);
    else if (income > 116800 && income <= 124100) centraltax = 16498 + 0.38 * (income - 116800);
    else if (income > 124100 && income <= 138700) centraltax = 19272 + 0.4 * (income - 124100);
    else if (income > 138700 && income <= 146000) centraltax = 25112 + 0.42 * (income - 138700);
    else if (income > 146000 && income <= 167900) centraltax = 28178 + 0.45 * (income - 146000);
    else if (income > 167900 && income <= 189800) centraltax = 38033 + Math.min(0.47, 0.8 - muntax[index]) * (income - 167900);
    else if (income > 189800 && income <= 219000) centraltax = 48326 + Math.min(0.49, 0.8 - muntax[index]) * (income - 189800);
    else if (income > 219000 && income <= 328500) centraltax = 62634 + Math.min(0.52, 0.84 - muntax[index]) * (income - 219000);
    else if (income > 328500) centraltax = 119574 + Math.min(0.54, 0.84 - muntax[index]) * (income - 328500);
  } else if (year === 1984) {
    if (income > 7600 && income <= 30400) centraltax = 0.03 * (income - 7600);
    else if (income > 30400 && income <= 53200) centraltax = 684 + 0.04 * (income - 30400);
    else if (income > 53200 && income <= 60800) centraltax = 1596 + 0.06 * (income - 53200);
    else if (income > 60800 && income <= 68400) centraltax = 2052 + 0.07 * (income - 60800);
    else if (income > 68400 && income <= 76000) centraltax = 2584 + 0.17 * (income - 68400);
    else if (income > 76000 && income <= 91200) centraltax = 3876 + 0.22 * (income - 76000);
    else if (income > 91200 && income <= 98800) centraltax = 7220 + 0.23 * (income - 91200);
    else if (income > 98800 && income <= 106400) centraltax = 8968 + 0.25 * (income - 98800);
    else if (income > 106400 && income <= 114000) centraltax = 10868 + 0.26 * (income - 106400);
    else if (income > 114000 && income <= 121600) centraltax = 12844 + 0.28 * (income - 114000);
    else if (income > 121600 && income <= 136800) centraltax = 14972 + 0.32 * (income - 121600);
    else if (income > 136800 && income <= 144400) centraltax = 19836 + 0.36 * (income - 136800);
    else if (income > 144400 && income <= 174800) centraltax = 22572 + 0.4 * (income - 144400);
    else if (income > 174800 && income <= 197600) centraltax = 34732 + 0.43 * (income - 174800);
    else if (income > 197600 && income <= 228000) centraltax = 44536 + Math.min(0.47, 0.8 - muntax[index]) * (income - 197600);
    else if (income > 228000 && income <= 342000) centraltax = 58824 + Math.min(0.49, 0.82 - muntax[index]) * (income - 228000);
    else if (income > 342000) centraltax = 114684 + Math.min(0.52, 0.82 - muntax[index]) * (income - 342000);
  } else if (year >= 1985 && year <= 1986) {
    if (income > 7800 && income <= 70200) centraltax = 0.04 * (income - 7800);
    else if (income > 70200 && income <= 78000) centraltax = 2496 + 0.15 * (income - 70200);
    else if (income > 78000 && income <= 124800) centraltax = 3666 + 0.2 * (income - 78000);
    else if (income > 124800 && income <= 140400) centraltax = 13026 + 0.25 * (income - 124800);
    else if (income > 140400 && income <= 148200) centraltax = 16926 + 0.29 * (income - 140400);
    else if (income > 148200 && income <= 163800) centraltax = 19188 + 0.34 * (income - 148200);
    else if (income > 163800 && income <= 179400) centraltax = 24492 + 0.35 * (income - 163800);
    else if (income > 179400 && income <= 202800) centraltax = 29952 + 0.4 * (income - 179400);
    else if (income > 202800 && income <= 351000) centraltax = 39312 + 0.45 * (income - 202800);
    else if (income > 351000) centraltax = 106002 + Math.min(0.5, 0.8 - muntax[index]) * (income - 351000);
  } else if (year === 1987) {
    if (income > 0 && income <= 63000) centraltax = 100 + 0.045 * income;
    else if (income > 63000 && income <= 72000) centraltax = 2935 + 0.13 * (income - 63000);
    else if (income > 72000 && income <= 126000) centraltax = 4105 + 0.2 * (income - 72000);
    else if (income > 126000 && income <= 135000) centraltax = 14905 + 0.25 * (income - 126000);
    else if (income > 135000 && income <= 144000) centraltax = 17155 + 0.3 * (income - 135000);
    else if (income > 144000 && income <= 180000) centraltax = 19855 + 0.34 * (income - 144000);
    else if (income > 180000 && income <= 189000) centraltax = 32095 + 0.4 * (income - 180000);
    else if (income > 189000 && income <= 342000) centraltax = 35695 + 0.45 * (income - 189000);
    else if (income > 342000) centraltax = 104545 + 0.47 * (income - 342000);
  } else if (year === 1988) {
    if (income > 0 && income <= 70000) centraltax = 100 + 0.05 * income;
    else if (income > 70000 && income <= 140000) centraltax = 3600 + 0.2 * (income - 70000);
    else if (income > 140000 && income <= 190000) centraltax = 17600 + 0.34 * (income - 140000);
    else if (income > 190000) centraltax = 34600 + 0.45 * (income - 190000);
  } else if (year === 1989) {
    if (income > 0 && income <= 75000) centraltax = 100 + 0.05 * income;
    else if (income > 75000 && income <= 140000) centraltax = 3850 + 0.17 * (income - 75000);
    else if (income > 140000 && income <= 190000) centraltax = 14900 + 0.31 * (income - 140000);
    else if (income > 190000) centraltax = 30400 + 0.42 * (income - 190000);
  } else if (year === 1990) {
    if (income > 0 && income <= 75000) centraltax = 100 + 0.03 * income;
    else if (income > 75000 && income <= 140000) centraltax = 2350 + 0.1 * (income - 75000);
    else if (income > 140000 && income <= 190000) centraltax = 8850 + 0.24 * (income - 140000);
    else if (income > 190000) centraltax = 20850 + 0.35 * (income - 190000);
  } else if (year >= 1991 && year <= 1994) {
    centraltax = Math.max(0, income - lowerbracket[index]) * 0.2;
  } else if (year >= 1995 && year <= 1998) {
    centraltax = Math.max(0, income - lowerbracket[index]) * 0.25;
  } else if (year >= 1999 && year <= 2019) {
    centraltax = Math.max(0, income - lowerbracket[index]) * 0.2 + Math.max(0, income - upperbracket[index]) * 0.05;
  } else if (year >= 2020) {
    centraltax = Math.max(0, income - lowerbracket[index]) * 0.2;
  }

  return centraltax;
}

function calcpayrolltax(income, year) {
  let payrolltax = 0;

  if (year === 1971) {
    if (income <= 6400) payrolltax = 0.0512 * income;
    else if (income > 6400 && income <= 48000) payrolltax = 328 + 0.1537 * (income - 6400);
    else if (income > 48000) payrolltax = 6722 + 0.02 * (income - 48000);
  } else if (year === 1972) {
    if (income <= 7100) payrolltax = 0.0547 * income;
    else if (income > 7100 && income <= 53250) payrolltax = 388 + 0.1597 * (income - 7100);
    else if (income > 53250) payrolltax = 7758 + 0.02 * (income - 53250);
  } else if (year === 1973) {
    if (income <= 7300) payrolltax = 0.0757 * income;
    else if (income > 7300 && income <= 54750) payrolltax = 553 + 0.1807 * (income - 7300);
    else if (income > 54750) payrolltax = 9127 + 0.04 * (income - 54750);
  } else if (year === 1974) {
    if (income <= 8100) payrolltax = 0.1187 * income;
    else if (income > 8100 && income <= 60750) payrolltax = 961 + 0.2237 * (income - 8100);
    else if (income > 60750) payrolltax = 12739 + 0.04 * (income - 60750);
  } else if (year === 1975) {
    if (income <= 9000) payrolltax = 0.1597 * income;
    else if (income > 9000 && income <= 67500) payrolltax = 1437 + 0.2672 * (income - 9000);
    else if (income > 67500) payrolltax = 17068 + 0.04 * (income - 67500);
  } else if (year === 1976) {
    if (income <= 9700) payrolltax = 0.19675 * income;
    else if (income > 9700 && income <= 72750) payrolltax = 1908 + 0.30675 * (income - 9700);
    else if (income > 72750) payrolltax = 21249 + 0.19675 * (income - 72750);
  } else if (year === 1977) {
    if (income <= 10700) payrolltax = 0.2295 * income;
    else if (income > 10700 && income <= 80250) payrolltax = 2456 + 0.347 * (income - 10700);
    else if (income > 80250) payrolltax = 26590 + 0.2295 * (income - 80250);
  } else if (year === 1978) {
    if (income <= 11800) payrolltax = 0.2197 * income;
    else if (income > 11800 && income <= 88500) payrolltax = 2592 + 0.3372 * (income - 11800);
    else if (income > 88500) payrolltax = 28455 + 0.2197 * (income - 88500);
  } else if (year === 1979) {
    if (income <= 13100) payrolltax = 0.2238 * income;
    else if (income > 13100 && income <= 98250) payrolltax = 2932 + 0.3413 * (income - 13100);
    else if (income > 98250) payrolltax = 31994 + 0.2238 * (income - 98250);
  } else if (year === 1980) {
    if (income <= 13900) payrolltax = 0.2325 * income;
    else if (income > 13900 && income <= 104250) payrolltax = 3232 + 0.3525 * (income - 13900);
    else if (income > 104250) payrolltax = 35080 + 0.2325 * (income - 104250);
  } else if (year === 1981) {
    if (income <= 16100) payrolltax = 0.23605 * income;
    else if (income > 16100 && income <= 120750) payrolltax = 3800 + 0.35855 * (income - 16100);
    else if (income > 120750) payrolltax = 41322 + 0.23605 * (income - 120750);
  } else if (year === 1982) payrolltax = 0.33055 * income;
  else if (year === 1983) payrolltax = 0.36255 * income;
  else if (year === 1984) payrolltax = 0.36155 * income;
  else if (year === 1985) payrolltax = 0.36455 * income;
  else if (year === 1986) payrolltax = 0.3645 * income;
  else if (year === 1987) payrolltax = 0.37076 * income;
  else if (year === 1988) payrolltax = 0.3707 * income;
  else if (year === 1989) payrolltax = 0.3797 * income;
  else if (year === 1990) payrolltax = 0.3897 * income;
  else if (year === 1991) payrolltax = 0.3803 * income;
  else if (year === 1992) payrolltax = 0.3483 * income;
  else if (year === 1993) payrolltax = 0.31 * income;
  else if (year === 1994) payrolltax = 0.3136 * income;
  else if (year === 1995) payrolltax = 0.3286 * income;
  else if (year === 1996) payrolltax = 0.3306 * income;
  else if (year === 1997) payrolltax = 0.3292 * income;
  else if (year === 1998) payrolltax = 0.3303 * income;
  else if (year === 1999) payrolltax = 0.3306 * income;
  else if (year === 2000) payrolltax = 0.3292 * income;
  else if (year === 2001) payrolltax = 0.3282 * income;
  else if (year === 2002) payrolltax = 0.3282 * income;
  else if (year === 2003) payrolltax = 0.3282 * income;
  else if (year === 2004) payrolltax = 0.327 * income;
  else if (year === 2005) payrolltax = 0.3246 * income;
  else if (year === 2006) payrolltax = 0.3228 * income;
  else if (year === 2007) payrolltax = 0.3242 * income;
  else if (year === 2008) payrolltax = 0.3242 * income;
  else if (year >= 2009) payrolltax = 0.3142 * income;

  return payrolltax;
}

/**
 * Beräkna historisk skatt för ett givet år (1971–2020).
 * @param {number} realincome — Årsinkomst i dagens penningvärde
 * @param {number} year — Skatteår (1971–2020)
 * @returns {object} Strukturerat resultatobjekt
 */
export function beräknaHistoriskSkatt(realincome, year) {
  const index = year - 1971;
  const cpiRatio = CPI[index];

  // Omräkna till periodens penningvärde
  const income = realincome * cpiRatio;

  // Folkpensionsavgift (1971–1974)
  let pensionfee = 0;
  if (year >= 1971 && year <= 1974) {
    if (income > calcbasicdeduction(income, year))
      pensionfee = Math.max(1500, (income - calcbasicdeduction(income, year)) * 0.05);
  }

  // Egenavgifter är avdragsgilla
  let workerscontribdeduction = calcworkerscontrib(income, year);
  if (year === 1974 && workerscontribdeduction > 500)
    workerscontribdeduction = 500;

  // Kommunalt taxerad inkomst
  const tincome = Math.max(0, income - workerscontribdeduction - calcextradeduction(income, year) - pensionfee);

  const municipalTax = Math.max(0, (tincome - calcbasicdeduction(tincome, year)) * muntax[index]);
  const eitc = calcEITC(tincome, year);
  const centralTax = Math.max(0, calccentraltax(tincome, year) - calctaxcredit(tincome, year));
  const employeeFees = calcworkerscontrib(income, year) + pensionfee;
  const payrollTax = calcpayrolltax(income, year);

  const incomeTax = municipalTax - eitc + centralTax + employeeFees;
  const vat = (income - incomeTax) * vatrate[index];
  const totalTax = incomeTax + payrollTax + vat;

  const netIncome = income - incomeTax;
  const netAfterAllTax = income - incomeTax - vat;
  const totalEmployerCost = income + payrollTax;
  const averageTaxRate = totalEmployerCost > 0 ? totalTax / totalEmployerCost : 0;

  return {
    year,
    realIncome: realincome,
    periodIncome: income,
    cpiRatio,
    municipalTax,
    centralTax,
    eitc,
    employeeFees,
    payrollTax,
    vat,
    incomeTax,
    totalTax,
    netIncome,
    netAfterAllTax,
    totalEmployerCost,
    averageTaxRate,
    municipalTaxRate: muntax[index],
    vatRate: vatrate[index],
  };
}
