/**
 * Convert a 2-letter ISO 3166-1 country code to its emoji flag.
 *
 * @param {string | null | undefined} countryCode
 * @returns {string}
 */
export function getCountryFlag(countryCode) {
  if (!countryCode || typeof countryCode !== 'string' || countryCode.length !== 2) return '🌐';
  const upper = countryCode.toUpperCase();
  if (!/^[A-Z]{2}$/.test(upper)) return '🌐';
  const codePoints = upper.split('').map((char) => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}
