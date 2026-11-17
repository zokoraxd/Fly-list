/**
 * Persistence layer: schema definition, validation, legacy migration.
 * Pure functions only so they can be unit tested without a browser.
 */

export const STORAGE_KEY = 'fly_list_state_v4';
export const LEGACY_STORAGE_KEY = 'fly_list_tasks_v3';
export const STATE_VERSION = 4;

export const TASK_STATUSES = ['planned', 'in-progress', 'completed'];
export const DETECTION_STATES = ['pending', 'done', 'none'];

/**
 * @typedef {Object} Task
 * @property {string} id
 * @property {string} title
 * @property {'planned' | 'in-progress' | 'completed'} status
 * @property {string | null} dueDate            YYYY-MM-DD
 * @property {'auto' | 'manual' | null} dueDateSource
 * @property {string | null} destinationKey
 * @property {'pending' | 'done' | 'none'} detection
 * @property {string} createdAt                ISO timestamp
 * @property {string} updatedAt                ISO timestamp
 *
 * @typedef {Object} Destination
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
 * @property {import('../services/travelApi.js').Weather | null} weather
 * @property {Record<string, import('../services/travelApi.js').TouristInfo>} tourist   keyed by language
 * @property {Record<string, import('../services/travelApi.js').TypicalWeather>} climate keyed by ISO date
 * @property {boolean} weatherError
 *
 * @typedef {Object} AppState
 * @property {number} version
 * @property {boolean} seeded
 * @property {Task[]} tasks
 * @property {Record<string, Destination>} destinations
 * @property {string[]} dismissedSuggestions
 */

/** @returns {AppState} */
export function createEmptyState() {
  return {
    version: STATE_VERSION,
    seeded: false,
    tasks: [],
    destinations: {},
    dismissedSuggestions: [],
  };
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function asString(value, fallback = '') {
  return typeof value === 'string' ? value : fallback;
}

function asNumber(value) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

/**
 * Coerce an arbitrary object into a valid Task, or return null if it cannot be one.
 *
 * @param {unknown} raw
 * @returns {Task | null}
 */
export function normalizeTask(raw) {
  if (!isObject(raw)) return null;
  const title = asString(raw.title).trim();
  const id = asString(raw.id).trim();
  if (!title || !id) return null;

  const now = new Date().toISOString();
  const status = TASK_STATUSES.includes(raw.status) ? raw.status : 'planned';
  const dueDate = typeof raw.dueDate === 'string' && ISO_DATE.test(raw.dueDate) ? raw.dueDate : null;
  const destinationKey = asString(raw.destinationKey).trim() || null;

  let detection = DETECTION_STATES.includes(raw.detection) ? raw.detection : null;
  if (!detection) detection = destinationKey ? 'done' : 'none';

  return {
    id,
    title,
    status,
    dueDate,
    dueDateSource: dueDate ? (raw.dueDateSource === 'manual' ? 'manual' : 'auto') : null,
    destinationKey,
    detection,
    createdAt: asString(raw.createdAt, now),
    updatedAt: asString(raw.updatedAt, asString(raw.createdAt, now)),
  };
}

/**
 * Coerce an arbitrary object into a valid Destination, or return null.
 *
 * @param {unknown} raw
 * @returns {Destination | null}
 */
export function normalizeDestination(raw) {
  if (!isObject(raw)) return null;
  const name = asString(raw.name).trim();
  const latitude = asNumber(raw.latitude ?? raw.lat);
  const longitude = asNumber(raw.longitude ?? raw.lon);
  if (!name || latitude === null || longitude === null) return null;

  const countryCode = asString(raw.countryCode).toUpperCase();
  const key = asString(raw.key).trim() || `${name}|${countryCode}`;

  return {
    key,
    name,
    country: asString(raw.country),
    countryCode,
    flag: asString(raw.flag, '🌐'),
    latitude,
    longitude,
    timezone: asString(raw.timezone) || null,
    admin1: asString(raw.admin1),
    wiki: asString(raw.wiki) || null,
    localNames: normalizeLocalNames(raw.localNames),
    source: raw.source === 'geocode' ? 'geocode' : 'local',
    weather: isObject(raw.weather) && isObject(raw.weather.current) && Array.isArray(raw.weather.daily) ? raw.weather : null,
    tourist: normalizeTourist(raw.tourist),
    climate: isObject(raw.climate) ? raw.climate : {},
    weatherError: Boolean(raw.weatherError),
  };
}

/** Display names by language, e.g. { ar: 'بغداد' }. Anything that is not a non-empty string is dropped. */
function normalizeLocalNames(raw) {
  if (!isObject(raw)) return {};
  const out = {};
  for (const [lang, value] of Object.entries(raw)) {
    if (typeof value === 'string' && value.trim()) out[lang] = value.trim();
  }
  return out;
}

function normalizeTourist(raw) {
  if (!isObject(raw)) return {};
  // Legacy single-language object
  if (typeof raw.extract === 'string') {
    return { [asString(raw.lang, 'en')]: { ...raw, lang: asString(raw.lang, 'en') } };
  }
  const out = {};
  for (const [lang, info] of Object.entries(raw)) {
    if (isObject(info) && typeof info.extract === 'string') out[lang] = { ...info, lang };
  }
  return out;
}

/**
 * Validate and repair a full state object (from storage or a backup file).
 * Throws when the input is not recognisably a Fly-List state.
 *
 * @param {unknown} raw
 * @returns {AppState}
 */
export function normalizeState(raw) {
  if (!isObject(raw) || !Array.isArray(raw.tasks)) {
    throw new Error('Invalid state: expected an object with a tasks array');
  }

  const state = createEmptyState();
  state.seeded = Boolean(raw.seeded);

  const seenIds = new Set();
  for (const item of raw.tasks) {
    const task = normalizeTask(item);
    if (task && !seenIds.has(task.id)) {
      seenIds.add(task.id);
      state.tasks.push(task);
    }
  }

  if (isObject(raw.destinations)) {
    for (const item of Object.values(raw.destinations)) {
      const destination = normalizeDestination(item);
      if (destination) state.destinations[destination.key] = destination;
    }
  }

  // Tasks pointing at destinations we no longer have fall back to "not detected".
  for (const task of state.tasks) {
    if (task.destinationKey && !state.destinations[task.destinationKey]) {
      task.destinationKey = null;
      task.detection = 'none';
    }
  }

  if (Array.isArray(raw.dismissedSuggestions)) {
    state.dismissedSuggestions = raw.dismissedSuggestions.filter((s) => typeof s === 'string');
  }

  return state;
}

/**
 * Convert the v3 flat task array (one destination copy per task) into v4 state.
 *
 * @param {unknown} legacy
 * @returns {AppState}
 */
export function migrateLegacyTasks(legacy) {
  const state = createEmptyState();
  state.seeded = true;
  if (!Array.isArray(legacy)) return state;

  for (const item of legacy) {
    if (!isObject(item)) continue;
    let destinationKey = null;

    if (isObject(item.destinationData)) {
      const destination = normalizeDestination({
        ...item.destinationData,
        // v3 stored weather in a different shape; drop it so it is fetched fresh.
        weather: null,
        timezone: null,
        tourist: item.destinationData.tourist,
      });
      if (destination) {
        destinationKey = destination.key;
        if (!state.destinations[destination.key]) state.destinations[destination.key] = destination;
      }
    }

    const task = normalizeTask({
      id: item.id,
      title: item.title,
      status: item.status,
      destinationKey,
      detection: destinationKey ? 'done' : 'none',
    });
    if (task) state.tasks.push(task);
  }

  return state;
}

/**
 * Load state from storage, migrating legacy data when found.
 *
 * @param {Storage} [storage]
 * @returns {AppState}
 */
export function loadState(storage = globalThis.localStorage) {
  if (!storage) return createEmptyState();

  try {
    const current = storage.getItem(STORAGE_KEY);
    if (current) return normalizeState(JSON.parse(current));
  } catch {
    // Corrupt current state: fall through to legacy / empty.
  }

  try {
    const legacy = storage.getItem(LEGACY_STORAGE_KEY);
    if (legacy) {
      const migrated = migrateLegacyTasks(JSON.parse(legacy));
      storage.removeItem(LEGACY_STORAGE_KEY);
      return migrated;
    }
  } catch {
    // Corrupt legacy state: start fresh.
  }

  return createEmptyState();
}

/**
 * Persist state. Returns false when storage is unavailable or full.
 *
 * @param {AppState} state
 * @param {Storage} [storage]
 * @returns {boolean}
 */
export function saveState(state, storage = globalThis.localStorage) {
  if (!storage) return false;
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

/**
 * Remove destinations no task references any more.
 *
 * @param {AppState} state
 */
export function pruneOrphanDestinations(state) {
  const used = new Set(state.tasks.map((t) => t.destinationKey).filter(Boolean));
  for (const key of Object.keys(state.destinations)) {
    if (!used.has(key)) delete state.destinations[key];
  }
}
