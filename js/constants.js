// Skattekonstanter — tunnt lager som importerar årsvisa datafiler.
// (c) Jacob Lundberg 2013-2022, uppdatering Erik Bengtzboe 2024-2026

import inkomstår2023 from '../data/2023.js?v=0.38';
import inkomstår2024 from '../data/2024.js?v=0.38';
import inkomstår2025 from '../data/2025.js?v=0.38';
import inkomstår2026 from '../data/2026.js?v=0.38';

/**
 * Alla stödda inkomstår, indexerade efter årtal.
 */
export const INKOMSTÅR = {
  2023: inkomstår2023,
  2024: inkomstår2024,
  2025: inkomstår2025,
  2026: inkomstår2026,
};

/** Standardår som används av UI:t. */
export const STANDARD_INKOMSTÅR = 2026;
