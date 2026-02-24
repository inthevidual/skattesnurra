/**
 * Format a number with non-breaking space as thousands separator.
 * Replaces original `tusental()` function.
 * @param {number|string} value
 * @returns {string} Formatted string with `&nbsp;` separators
 */
export function formatWithThousandsSeparator(value) {
  let str = String(value);
  const parts = str.split('.');
  let integerPart = parts[0];
  const decimalPart = parts.length > 1 ? '.' + parts[1] : '';
  const rgx = /(\d+)(\d{3})/;
  while (rgx.test(integerPart)) {
    integerPart = integerPart.replace(rgx, '$1&nbsp;$2');
  }
  return integerPart + decimalPart;
}

/**
 * Round a number and format it for display.
 * Negative values are prefixed with `&minus;` (HTML entity).
 * Replaces original `avrunda()` function.
 * @param {number} value
 * @returns {string} Formatted HTML string
 */
export function formatRounded(value) {
  let num = Math.round(value);
  let negative = false;
  if (num < 0) {
    num = -num;
    negative = true;
  }
  const formatted = formatWithThousandsSeparator(num);
  return negative ? '&minus;' + formatted : formatted;
}
