/**
 * Name to show for a destination in the current language. Places picked on the globe can carry a
 * localised name; everything else keeps its canonical English name.
 *
 * @param {{ name: string, localNames?: Record<string, string> } | null | undefined} destination
 * @param {string} locale
 * @returns {string}
 */
export function localizedName(destination, locale) {
  if (!destination) return '';
  return destination.localNames?.[locale] || destination.name;
}

/** Country name in the given language using the browser's built-in region names (no network). */
export function localizedCountry(countryCode, locale, fallback = '') {
  if (!countryCode) return fallback;
  try {
    return new Intl.DisplayNames([locale], { type: 'region' }).of(countryCode.toUpperCase()) || fallback;
  } catch {
    return fallback;
  }
}
