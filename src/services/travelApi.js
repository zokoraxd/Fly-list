import { extractPlaceFromText } from '../data/places.js';
import { getCountryFlag } from '../utils/flags.js';
import { distanceKm } from '../utils/geo.js';
import { fetchJson } from '../utils/http.js';
import { fromISODate, toISODate } from '../utils/dateParser.js';

/** Weather older than this is refreshed when the user looks at it. */
export const WEATHER_TTL_MS = 30 * 60 * 1000;

/** Open-Meteo returns at most this many forecast days. */
export const FORECAST_DAYS = 16;

const OPEN_METEO_FORECAST = 'https://api.open-meteo.com/v1/forecast';
const OPEN_METEO_ARCHIVE = 'https://archive-api.open-meteo.com/v1/archive';
const OPEN_METEO_GEOCODE = 'https://geocoding-api.open-meteo.com/v1/search';

/**
 * Map a WMO weather code to a translation key and an emoji.
 * https://open-meteo.com/en/docs#weathervariables
 *
 * @param {number} code
 * @returns {{ key: string, icon: string }}
 */
export function interpretWeatherCode(code) {
  switch (code) {
    case 0:
      return { key: 'clear', icon: '☀️' };
    case 1:
      return { key: 'mainlyClear', icon: '🌤️' };
    case 2:
      return { key: 'partlyCloudy', icon: '⛅' };
    case 3:
      return { key: 'overcast', icon: '☁️' };
    case 45:
    case 48:
      return { key: 'fog', icon: '🌫️' };
    case 51:
    case 53:
    case 55:
      return { key: 'drizzle', icon: '🌦️' };
    case 56:
    case 57:
      return { key: 'freezingDrizzle', icon: '🌧️' };
    case 61:
    case 63:
    case 65:
      return { key: 'rain', icon: '🌧️' };
    case 66:
    case 67:
      return { key: 'freezingRain', icon: '🌧️' };
    case 71:
    case 73:
    case 75:
      return { key: 'snow', icon: '❄️' };
    case 77:
      return { key: 'snowGrains', icon: '🌨️' };
    case 80:
    case 81:
    case 82:
      return { key: 'showers', icon: '🌧️' };
    case 85:
    case 86:
      return { key: 'snowShowers', icon: '🌨️' };
    case 95:
    case 96:
    case 99:
      return { key: 'thunderstorm', icon: '⛈️' };
    default:
      return { key: 'unknown', icon: '🌡️' };
  }
}

/** Weather-condition keys that mean "it will be wet". */
export const WET_CONDITIONS = new Set(['drizzle', 'freezingDrizzle', 'rain', 'freezingRain', 'showers', 'thunderstorm']);

/** Weather-condition keys that mean "it will snow". */
export const SNOW_CONDITIONS = new Set(['snow', 'snowGrains', 'snowShowers']);

/**
 * Fetch current conditions plus a 16-day daily forecast.
 *
 * @param {number} latitude
 * @param {number} longitude
 * @returns {Promise<Weather>}
 */
export async function fetchWeather(latitude, longitude) {
  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    current: 'temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m',
    daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max',
    forecast_days: String(FORECAST_DAYS),
    timezone: 'auto',
  });
  const data = await fetchJson(`${OPEN_METEO_FORECAST}?${params}`);

  const current = data.current || {};
  const currentCondition = interpretWeatherCode(current.weather_code);

  const daily = [];
  const times = data.daily?.time || [];
  for (let i = 0; i < times.length; i++) {
    const condition = interpretWeatherCode(data.daily.weather_code?.[i]);
    daily.push({
      date: times[i],
      max: roundOrNull(data.daily.temperature_2m_max?.[i]),
      min: roundOrNull(data.daily.temperature_2m_min?.[i]),
      precipProb: roundOrNull(data.daily.precipitation_probability_max?.[i]),
      windMax: roundOrNull(data.daily.wind_speed_10m_max?.[i]),
      conditionKey: condition.key,
      icon: condition.icon,
    });
  }

  return {
    fetchedAt: new Date().toISOString(),
    timezone: data.timezone || null,
    current: {
      temperature: roundOrNull(current.temperature_2m),
      humidity: roundOrNull(current.relative_humidity_2m),
      windSpeed: roundOrNull(current.wind_speed_10m),
      conditionKey: currentCondition.key,
      icon: currentCondition.icon,
    },
    daily,
  };
}

/**
 * Historical conditions for the same calendar window last year, averaged over
 * a 7-day window. Used when a trip is beyond the forecast horizon.
 *
 * @param {number} latitude
 * @param {number} longitude
 * @param {string} isoDate  YYYY-MM-DD of the trip
 * @returns {Promise<TypicalWeather | null>}
 */
export async function fetchTypicalWeather(latitude, longitude, isoDate) {
  const target = fromISODate(isoDate);
  if (!target) return null;

  const lastYear = new Date(target);
  lastYear.setFullYear(target.getFullYear() - 1);
  const start = new Date(lastYear);
  start.setDate(start.getDate() - 3);
  const end = new Date(lastYear);
  end.setDate(end.getDate() + 3);

  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    start_date: toISODate(start),
    end_date: toISODate(end),
    daily: 'temperature_2m_max,temperature_2m_min,weather_code',
    timezone: 'auto',
  });
  const data = await fetchJson(`${OPEN_METEO_ARCHIVE}?${params}`);
  const maxes = (data.daily?.temperature_2m_max || []).filter(isNumber);
  const mins = (data.daily?.temperature_2m_min || []).filter(isNumber);
  const codes = (data.daily?.weather_code || []).filter(isNumber);
  if (maxes.length === 0 || mins.length === 0) return null;

  const condition = interpretWeatherCode(mostCommon(codes));
  return {
    date: isoDate,
    basedOnYear: lastYear.getFullYear(),
    max: Math.round(average(maxes)),
    min: Math.round(average(mins)),
    conditionKey: condition.key,
    icon: condition.icon,
  };
}

/**
 * Find the forecast entry for a specific day, if it is within the horizon.
 *
 * @param {Weather | null | undefined} weather
 * @param {string | null | undefined} isoDate
 * @returns {DailyForecast | null}
 */
export function getForecastForDate(weather, isoDate) {
  if (!weather?.daily || !isoDate) return null;
  return weather.daily.find((d) => d.date === isoDate) || null;
}

/** True when the cached weather should be refreshed. */
export function isWeatherStale(weather, now = Date.now()) {
  if (!weather?.fetchedAt) return true;
  const fetched = new Date(weather.fetchedAt).getTime();
  return !Number.isFinite(fetched) || now - fetched > WEATHER_TTL_MS;
}

// ---------------------------------------------------------------------------
// Wikipedia
// ---------------------------------------------------------------------------

function wikiSummaryUrl(lang, title) {
  return `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title.replace(/ /g, '_'))}`;
}

async function fetchWikiSummary(lang, title) {
  try {
    const data = await fetchJson(wikiSummaryUrl(lang, title));
    if (!data || data.type === 'disambiguation' || !data.extract) return null;
    return {
      lang,
      title: data.title || title,
      description: data.description || '',
      extract: data.extract,
      thumbnail: data.thumbnail?.source || null,
      pageUrl: data.content_urls?.desktop?.page || `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(title)}`,
    };
  } catch {
    return null;
  }
}

async function searchWikiTitle(query) {
  const params = new URLSearchParams({
    action: 'query',
    list: 'search',
    srsearch: query,
    srlimit: '1',
    format: 'json',
    origin: '*',
  });
  try {
    const data = await fetchJson(`https://en.wikipedia.org/w/api.php?${params}`);
    return data.query?.search?.[0]?.title || null;
  } catch {
    return null;
  }
}

async function fetchArabicTitle(englishTitle) {
  const params = new URLSearchParams({
    action: 'query',
    prop: 'langlinks',
    titles: englishTitle,
    lllang: 'ar',
    format: 'json',
    origin: '*',
  });
  try {
    const data = await fetchJson(`https://en.wikipedia.org/w/api.php?${params}`);
    const pages = data.query?.pages || {};
    for (const page of Object.values(pages)) {
      const link = page.langlinks?.find((l) => l.lang === 'ar');
      if (link) return link['*'];
    }
  } catch {
    // fall through
  }
  return null;
}

/**
 * Fetch a tourist summary for a place, resolving disambiguation pages and
 * preferring the requested language when an article exists.
 *
 * @param {{ name: string, country?: string, admin1?: string, wiki?: string }} place
 * @param {{ locale?: 'en' | 'ar' }} [options]
 * @returns {Promise<TouristInfo | null>}
 */
export async function fetchTouristInfo(place, options = {}) {
  if (!place?.name) return null;
  const locale = options.locale || 'en';

  const candidates = [];
  if (place.wiki) candidates.push(place.wiki);
  candidates.push(place.name);
  if (place.country && place.country !== place.name) candidates.push(`${place.name}, ${place.country}`);
  if (place.admin1 && place.admin1 !== place.name) candidates.push(`${place.name}, ${place.admin1}`);

  let english = null;
  for (const title of candidates) {
    english = await fetchWikiSummary('en', title);
    if (english) break;
  }

  if (!english) {
    const searched = await searchWikiTitle(`"${place.name}" ${place.admin1 || place.country || ''}`.trim());
    if (searched) english = await fetchWikiSummary('en', searched);
  }

  if (!english) return null;

  if (locale === 'ar') {
    const arabicTitle = await fetchArabicTitle(english.title);
    if (arabicTitle) {
      const arabic = await fetchWikiSummary('ar', arabicTitle);
      if (arabic) return arabic;
    }
  }

  return english;
}

// ---------------------------------------------------------------------------
// Geocoding fallback
// ---------------------------------------------------------------------------

const TRAVEL_PHRASES = [
  /(?:flight|flights|fly|flying|trip|travel|traveling|travelling|go|going|heading|drive|driving|move|moving|ticket|tickets)\s+to\s+(?<place>[^,.!?;:]+?)(?=\s+(?:on|in|at|next|this|for|with|tomorrow|today|by|from|before|after|and)\b|\s*$|[,.!?;:])/i,
  /(?:visit|visiting|explore|exploring|tour|touring|see|seeing|discover)\s+(?<place>[^,.!?;:]+?)(?=\s+(?:on|in|at|next|this|for|with|tomorrow|today|by|from|before|after|and)\b|\s*$|[,.!?;:])/i,
  /(?:hotel|hostel|airbnb|stay|staying|staycation|vacation|holiday|weekend|week|days?|nights?|honeymoon|conference|wedding|meeting)\s+in\s+(?<place>[^,.!?;:]+?)(?=\s+(?:on|in|at|next|this|for|with|tomorrow|today|by|from|before|after|and)\b|\s*$|[,.!?;:])/i,
  /(?:^|\s)(?:to|in|at)\s+(?<place>[A-Z][^,.!?;:]*?)(?=\s+(?:on|in|at|next|this|for|with|tomorrow|today|by|from|before|after|and)\b|\s*$|[,.!?;:])/,
  /(?:إلى|الى|في|فى|زيارة|زياره)\s+(?<place>[؀-ۿ][^,،.!؟?;:]*?)(?=\s+(?:يوم|في|غدا|غداً|بكرة|بعد|الأسبوع|الاسبوع|الشهر|مع|قبل|ل)\b|\s*$|[,،.!؟?;:])/,
];

const ACTION_VERBS =
  /^(buy|pack|bring|check|call|do|finish|make|renew|print|email|send|pay|book|get|take|fix|clean|wash|read|write|charge|download|install|cancel|confirm|remind|ask|tell|text|order|pick|drop|اشتري|اشتر|احضر|جهز|اتصل|ادفع|اطبع|راجع|احجز|خذ|اكتب)\b/i;

const STOP_WORDS = new Set(['the', 'a', 'an', 'my', 'our', 'his', 'her', 'their', 'this', 'that', 'some']);

/**
 * Decide which phrase, if any, should be sent to the geocoder. Returns null
 * for ordinary tasks so we never hit the network for "Renew passport".
 *
 * @param {string} text
 * @returns {string | null}
 */
export function extractGeocodeQuery(text) {
  if (!text) return null;
  const trimmed = text.trim();
  if (!trimmed) return null;

  for (const pattern of TRAVEL_PHRASES) {
    const m = trimmed.match(pattern);
    if (m?.groups?.place) {
      const cleaned = m.groups.place
        .split(/\s+/)
        .filter((w) => !STOP_WORDS.has(w.toLowerCase()))
        .join(' ')
        .trim();
      if (cleaned.length >= 3) return cleaned;
    }
  }

  // Bare destination: 1–3 words, no action verb, every Latin word capitalised
  // ("Marrakesh", "Kuala Lumpur"), or Arabic script.
  const words = trimmed.split(/\s+/);
  if (words.length <= 3 && !ACTION_VERBS.test(trimmed)) {
    const looksLikeName = words.every((w) => /^[؀-ۿ]/.test(w) || /^[A-Z][\p{L}'-]*$/u.test(w));
    if (looksLikeName && trimmed.length >= 3) return trimmed;
  }

  return null;
}

const ACCEPTED_FEATURE_CODES = /^(PPL|PCL|ADM1|ADM2|ISL|RGN)/;

/**
 * Resolve a free-text place name through the Open-Meteo geocoder.
 * Only populated places, countries and first/second-level regions are accepted.
 *
 * @param {string} query
 * @returns {Promise<GeocodedPlace | null>}
 */
export async function geocodePlace(query) {
  const params = new URLSearchParams({ name: query, count: '5', language: 'en', format: 'json' });
  const data = await fetchJson(`${OPEN_METEO_GEOCODE}?${params}`);
  const results = Array.isArray(data.results) ? data.results : [];

  const match = results.find((r) => ACCEPTED_FEATURE_CODES.test(r.feature_code || '') && (r.population > 0 || /^(PCL|ADM1)/.test(r.feature_code || '')));
  if (!match) return null;

  return {
    name: match.name,
    country: match.country || '',
    countryCode: match.country_code || '',
    flag: getCountryFlag(match.country_code),
    lat: match.latitude,
    lon: match.longitude,
    timezone: match.timezone || null,
    admin1: match.admin1 || '',
  };
}

// ---------------------------------------------------------------------------
// Reverse geocoding (a point picked on the globe)
// ---------------------------------------------------------------------------

const NOMINATIM_REVERSE = 'https://nominatim.openstreetmap.org/reverse';
const reverseCache = new Map();

/**
 * Turn a Nominatim reverse-geocoding response into a place, or null for open water / unnamed areas.
 *
 * @param {any} data
 * @returns {{ name: string, country: string, countryCode: string, flag: string, admin1: string } | null}
 */
export function parseReverseGeocode(data) {
  if (!data || data.error || !data.address) return null;
  const a = data.address;
  // Towns and cities first; in open country fall back to the province, not a tiny rural district.
  const name = a.city || a.town || a.village || a.state || a.country;
  if (!name) return null;
  const countryCode = String(a.country_code || '').toUpperCase();
  return {
    name,
    country: a.country || '',
    countryCode,
    flag: getCountryFlag(countryCode),
    admin1: a.state && a.state !== name ? a.state : '',
  };
}

/**
 * Find the town, region or country at a coordinate. Free and keyless; the public server allows about
 * one request per second, so results are cached by roughly 11 km cells.
 *
 * @param {number} latitude
 * @param {number} longitude
 * @returns {Promise<ReturnType<typeof parseReverseGeocode>>}
 */
export async function reverseGeocode(latitude, longitude) {
  const cacheKey = `${latitude.toFixed(1)},${longitude.toFixed(1)}`;
  if (reverseCache.has(cacheKey)) return reverseCache.get(cacheKey);

  const params = new URLSearchParams({
    lat: String(latitude),
    lon: String(longitude),
    format: 'jsonv2',
    zoom: '10',
    addressdetails: '1',
    'accept-language': 'en',
  });
  const place = parseReverseGeocode(await fetchJson(`${NOMINATIM_REVERSE}?${params}`));
  reverseCache.set(cacheKey, place);
  return place;
}

/**
 * Look up the name of a place in another language through the Open-Meteo geocoder, keeping only a
 * result in the same country that is close to the original point. Returns null when nothing fits.
 *
 * @param {{ name: string, countryCode?: string, latitude: number, longitude: number }} place
 * @param {string} [language]
 * @returns {Promise<string | null>}
 */
export async function fetchLocalName(place, language = 'ar') {
  try {
    const params = new URLSearchParams({ name: place.name, count: '10', language, format: 'json' });
    const data = await fetchJson(`${OPEN_METEO_GEOCODE}?${params}`);
    const results = Array.isArray(data.results) ? data.results : [];
    const nearby = results
      .filter((r) => !place.countryCode || r.country_code === place.countryCode)
      .map((r) => ({ name: r.name, km: distanceKm([place.latitude, place.longitude], [r.latitude, r.longitude]) }))
      .filter((r) => r.km < 80)
      .sort((x, y) => x.km - y.km);
    return nearby[0]?.name || null;
  } catch {
    return null;
  }
}

/**
 * Find a landmark or other named place (Eiffel Tower, Machu Picchu) through Wikipedia, which the
 * city geocoder does not cover. Returns the best article that has coordinates.
 *
 * @param {string} query
 * Arabic Wikipedia does not expose coordinates for many articles, so an Arabic hit falls back to the
 * English article it links to. `name` is always the English title; `localName` is the Arabic one.
 *
 * @param {string} query
 * @param {'en' | 'ar'} [language]
 * @returns {Promise<{ name: string, localName: string | null, latitude: number, longitude: number } | null>}
 */
export async function findLandmark(query, language = 'en') {
  const params = new URLSearchParams({
    action: 'query',
    generator: 'search',
    gsrsearch: query,
    gsrlimit: '5',
    prop: 'coordinates|langlinks',
    colimit: '5',
    lllang: 'en',
    lllimit: '5',
    format: 'json',
    origin: '*',
  });
  try {
    const data = await fetchJson(`https://${language}.wikipedia.org/w/api.php?${params}`);
    const pages = Object.values(data.query?.pages || {})
      .sort((a, b) => a.index - b.index)
      .slice(0, 3);

    for (const page of pages) {
      const coordinate = page.coordinates?.[0];
      const english = language === 'en' ? page.title : page.langlinks?.[0]?.['*'] || null;
      const localName = language === 'en' ? null : page.title;

      if (coordinate && Number.isFinite(coordinate.lat)) {
        return { name: english || page.title, localName, latitude: coordinate.lat, longitude: coordinate.lon };
      }
      if (english && language !== 'en') {
        const found = await fetchArticleCoordinates(english);
        if (found) return { name: english, localName, ...found };
      }
    }
    return null;
  } catch {
    return null;
  }
}

/** Coordinates of an English Wikipedia article, or null when it has none. */
async function fetchArticleCoordinates(title) {
  const params = new URLSearchParams({ action: 'query', titles: title, prop: 'coordinates', redirects: '1', format: 'json', origin: '*' });
  try {
    const data = await fetchJson(`https://en.wikipedia.org/w/api.php?${params}`);
    const page = Object.values(data.query?.pages || {})[0];
    const coordinate = page?.coordinates?.[0];
    return coordinate && Number.isFinite(coordinate.lat) ? { latitude: coordinate.lat, longitude: coordinate.lon } : null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Detection pipeline
// ---------------------------------------------------------------------------

/**
 * Build the stable key used to deduplicate destinations across tasks.
 *
 * @param {{ name: string, countryCode?: string }} place
 * @returns {string}
 */
export function makeDestinationKey(place) {
  return `${place.name}|${place.countryCode || ''}`;
}

/**
 * Find the destination mentioned in a task title. Local gazetteer first,
 * geocoder second. Never throws; returns null when nothing is found.
 *
 * @param {string} text
 * @returns {Promise<DetectedPlace | null>}
 */
export async function detectPlace(text) {
  const local = extractPlaceFromText(text);
  if (local) {
    return {
      key: makeDestinationKey(local),
      name: local.name,
      country: local.country,
      countryCode: local.countryCode,
      flag: local.flag,
      latitude: local.lat,
      longitude: local.lon,
      timezone: null,
      admin1: '',
      wiki: local.wiki || null,
      source: 'local',
    };
  }

  const query = extractGeocodeQuery(text);
  if (!query) return null;

  try {
    const geocoded = await geocodePlace(query);
    if (!geocoded) return null;
    return {
      key: makeDestinationKey(geocoded),
      name: geocoded.name,
      country: geocoded.country,
      countryCode: geocoded.countryCode,
      flag: geocoded.flag,
      latitude: geocoded.lat,
      longitude: geocoded.lon,
      timezone: geocoded.timezone,
      admin1: geocoded.admin1,
      wiki: null,
      source: 'geocode',
    };
  } catch {
    return null;
  }
}

/**
 * Fetch weather and tourist info for a place in parallel. Partial failures
 * are reported rather than thrown so the UI can show what it has.
 *
 * @param {DetectedPlace} place
 * @param {{ locale?: 'en' | 'ar' }} [options]
 * @returns {Promise<{ weather: Weather | null, tourist: TouristInfo | null, errors: { weather: boolean, tourist: boolean } }>}
 */
export async function enrichPlace(place, options = {}) {
  const [weatherResult, touristResult] = await Promise.allSettled([fetchWeather(place.latitude, place.longitude), fetchTouristInfo(place, options)]);

  return {
    weather: weatherResult.status === 'fulfilled' ? weatherResult.value : null,
    tourist: touristResult.status === 'fulfilled' ? touristResult.value : null,
    errors: {
      weather: weatherResult.status !== 'fulfilled',
      tourist: touristResult.status !== 'fulfilled' || touristResult.value === null,
    },
  };
}

function roundOrNull(value) {
  return isNumber(value) ? Math.round(value) : null;
}

function isNumber(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

function average(values) {
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function mostCommon(values) {
  if (values.length === 0) return -1;
  const counts = new Map();
  let best = values[0];
  let bestCount = 0;
  for (const v of values) {
    const n = (counts.get(v) || 0) + 1;
    counts.set(v, n);
    if (n > bestCount) {
      best = v;
      bestCount = n;
    }
  }
  return best;
}

/**
 * @typedef {Object} DailyForecast
 * @property {string} date
 * @property {number | null} max
 * @property {number | null} min
 * @property {number | null} precipProb
 * @property {number | null} windMax
 * @property {string} conditionKey
 * @property {string} icon
 *
 * @typedef {Object} Weather
 * @property {string} fetchedAt
 * @property {string | null} timezone
 * @property {{ temperature: number | null, humidity: number | null, windSpeed: number | null, conditionKey: string, icon: string }} current
 * @property {DailyForecast[]} daily
 *
 * @typedef {Object} TypicalWeather
 * @property {string} date
 * @property {number} basedOnYear
 * @property {number} max
 * @property {number} min
 * @property {string} conditionKey
 * @property {string} icon
 *
 * @typedef {Object} TouristInfo
 * @property {string} lang
 * @property {string} title
 * @property {string} description
 * @property {string} extract
 * @property {string | null} thumbnail
 * @property {string} pageUrl
 *
 * @typedef {Object} GeocodedPlace
 * @property {string} name
 * @property {string} country
 * @property {string} countryCode
 * @property {string} flag
 * @property {number} lat
 * @property {number} lon
 * @property {string | null} timezone
 * @property {string} admin1
 *
 * @typedef {Object} DetectedPlace
 * @property {string} key
 * @property {string} name
 * @property {string} country
 * @property {string} countryCode
 * @property {string} flag
 * @property {number} latitude
 * @property {number} longitude
 * @property {string | null} timezone
 * @property {string} admin1
 * @property {string | null} wiki
 * @property {'local' | 'geocode'} source
 */
