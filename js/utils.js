/**
 * Formatera ett tal med hårt blanksteg som tusental-separator.
 * Ersätter ursprunglig `tusental()`-funktion.
 * @param {number|string} värde
 * @returns {string} Formaterad sträng med `&nbsp;`-separator
 */
export function formateraMedTusental(värde) {
  let sträng = String(värde);
  const delar = sträng.split('.');
  let heltalsDel = delar[0];
  const decimalDel = delar.length > 1 ? '.' + delar[1] : '';
  const rgx = /(\d+)(\d{3})/;
  while (rgx.test(heltalsDel)) {
    heltalsDel = heltalsDel.replace(rgx, '$1&nbsp;$2');
  }
  return heltalsDel + decimalDel;
}

/**
 * Avrunda ett tal och formatera det för visning.
 * Negativa värden får `&minus;`-prefix (HTML-entitet).
 * Ersätter ursprunglig `avrunda()`-funktion.
 * @param {number} värde
 * @returns {string} Formaterad HTML-sträng
 */
export function formateraAvrundat(värde) {
  let tal = Math.round(värde);
  let negativt = false;
  if (tal < 0) {
    tal = -tal;
    negativt = true;
  }
  const formaterat = formateraMedTusental(tal);
  return negativt ? '&minus;' + formaterat : formaterat;
}
