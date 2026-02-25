// Skattekonstanter — tunnt lager som importerar årsvisa datafiler.
// (c) Jacob Lundberg 2013-2022, uppdatering Erik Bengtzboe 2024-2026

import inkomstår2018 from '../data/2018.js';
import inkomstår2019 from '../data/2019.js';
import inkomstår2020 from '../data/2020.js';
import inkomstår2021 from '../data/2021.js';
import inkomstår2022 from '../data/2022.js';
import inkomstår2023 from '../data/2023.js';
import inkomstår2024 from '../data/2024.js';
import inkomstår2025 from '../data/2025.js';
import inkomstår2026 from '../data/2026.js';

/**
 * Alla stödda inkomstår, indexerade efter årtal.
 */
export const INKOMSTÅR = {
  2018: inkomstår2018,
  2019: inkomstår2019,
  2020: inkomstår2020,
  2021: inkomstår2021,
  2022: inkomstår2022,
  2023: inkomstår2023,
  2024: inkomstår2024,
  2025: inkomstår2025,
  2026: inkomstår2026,
};

/** Standardår som används av UI:t. */
export const STANDARD_INKOMSTÅR = 2026;
