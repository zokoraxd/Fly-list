import { computed, reactive, watch } from 'vue';
import { createId } from '../utils/id.js';
import { parseDateFromText, toISODate } from '../utils/dateParser.js';
import { isOffline } from '../utils/http.js';
import { loadState, pruneOrphanDestinations, saveState, TASK_STATUSES } from '../store/storage.js';
import { detectPlace, enrichPlace, fetchTouristInfo, fetchTypicalWeather, fetchWeather, isWeatherStale } from '../services/travelApi.js';
import { useI18n } from '../i18n/index.js';
import { useToast } from './useToast.js';

/** @type {import('../store/storage.js').AppState} */
const state = reactive(loadState());

/** Transient per-destination flags that must not be persisted. */
const transient = reactive({
  /** @type {Record<string, boolean>} */
  refreshing: {},
  /** @type {Record<string, boolean>} */
  loadingClimate: {},
  /** @type {Record<string, boolean>} */
  loadingTourist: {},
});

let saveTimer = null;

/** Write immediately, cancelling any pending debounced write. */
function flushSave() {
  if (saveTimer === null) return;
  clearTimeout(saveTimer);
  saveTimer = null;
  saveState(state);
}

watch(
  state,
  () => {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      saveTimer = null;
      saveState(state);
    }, 150);
  },
  { deep: true },
);

// A debounced write can be lost if the tab closes or reloads inside the window,
// so flush whenever the page is hidden or about to unload.
if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', flushSave);
  window.addEventListener('beforeunload', flushSave);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flushSave();
  });
}

/** In-flight enrichment promises keyed by destination, so parallel tasks share one request. */
const inflight = new Map();

function nowIso() {
  return new Date().toISOString();
}

function todayIso() {
  return toISODate(new Date());
}

function findTask(id) {
  return state.tasks.find((t) => t.id === id) || null;
}

function makeTask(title, { dueDate, dueDateSource, status = 'planned' }) {
  const timestamp = nowIso();
  return {
    id: createId(),
    title,
    status,
    dueDate: dueDate || null,
    dueDateSource: dueDate ? dueDateSource : null,
    destinationKey: null,
    detection: 'pending',
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

/**
 * Detect the destination for a task, attach it, and fetch weather/guide.
 * Safe to call repeatedly; never throws.
 */
async function runDetection(taskId, { t, locale, toast }) {
  const task = findTask(taskId);
  if (!task) return;
  task.detection = 'pending';

  const place = await detectPlace(task.title);
  const current = findTask(taskId);
  if (!current) return;

  if (!place) {
    current.destinationKey = null;
    current.detection = 'none';
    current.updatedAt = nowIso();
    pruneOrphanDestinations(state);
    return;
  }

  if (!state.destinations[place.key]) {
    state.destinations[place.key] = {
      ...place,
      weather: null,
      tourist: {},
      climate: {},
      weatherError: false,
    };
  }

  current.destinationKey = place.key;
  current.detection = 'done';
  current.updatedAt = nowIso();
  pruneOrphanDestinations(state);

  await ensureEnriched(place.key, { t, locale, toast });
}

/**
 * Fetch weather and tourist info for a destination when missing or stale.
 */
async function ensureEnriched(key, { t, locale, toast, force = false }) {
  const destination = state.destinations[key];
  if (!destination) return;

  const needsWeather = force || !destination.weather || isWeatherStale(destination.weather);
  const needsTourist = !destination.tourist[locale] && !destination.tourist.en;
  if (!needsWeather && !needsTourist) return;

  if (inflight.has(key)) return inflight.get(key);

  const job = (async () => {
    transient.refreshing[key] = true;
    try {
      if (needsWeather && needsTourist) {
        const result = await enrichPlace(destination, { locale });
        const target = state.destinations[key];
        if (!target) return;
        if (result.weather) {
          target.weather = result.weather;
          if (result.weather.timezone) target.timezone = result.weather.timezone;
        }
        if (result.tourist) target.tourist[result.tourist.lang] = result.tourist;
        target.weatherError = result.errors.weather;
        if (result.errors.weather) notifyWeatherFailure(target, { t, locale, toast });
      } else if (needsWeather) {
        try {
          const weather = await fetchWeather(destination.latitude, destination.longitude);
          const target = state.destinations[key];
          if (!target) return;
          target.weather = weather;
          if (weather.timezone) target.timezone = weather.timezone;
          target.weatherError = false;
        } catch {
          const target = state.destinations[key];
          if (target) {
            target.weatherError = true;
            notifyWeatherFailure(target, { t, locale, toast });
          }
        }
      } else {
        await ensureTourist(key, locale);
      }
    } finally {
      transient.refreshing[key] = false;
      inflight.delete(key);
    }
  })();

  inflight.set(key, job);
  return job;
}

function notifyWeatherFailure(destination, { t, locale, toast }) {
  if (!toast) return;
  toast.error(t(isOffline() ? 'toast.offline' : 'toast.enrichFailed', { name: destination.name }), {
    action: {
      label: t('toast.retry'),
      handler: () => ensureEnriched(destination.key, { t, locale, toast, force: true }),
    },
  });
}

/**
 * Make sure a tourist summary exists in the requested language.
 */
async function ensureTourist(key, locale) {
  const destination = state.destinations[key];
  if (!destination || destination.tourist[locale] || transient.loadingTourist[key]) return;
  transient.loadingTourist[key] = true;
  try {
    const info = await fetchTouristInfo(destination, { locale });
    const target = state.destinations[key];
    if (target && info) target.tourist[info.lang] = info;
  } catch {
    // Non-critical: the UI shows the English version or a placeholder.
  } finally {
    transient.loadingTourist[key] = false;
  }
}

/**
 * Historical "typical weather" for a trip beyond the forecast horizon.
 */
async function ensureTypicalWeather(key, isoDate) {
  const destination = state.destinations[key];
  if (!destination || !isoDate || destination.climate[isoDate]) return;
  const flag = `${key}|${isoDate}`;
  if (transient.loadingClimate[flag]) return;
  transient.loadingClimate[flag] = true;
  try {
    const typical = await fetchTypicalWeather(destination.latitude, destination.longitude, isoDate);
    const target = state.destinations[key];
    if (target && typical) target.climate[isoDate] = typical;
  } catch {
    // Shown as unavailable in the modal.
  } finally {
    transient.loadingClimate[flag] = false;
  }
}

/**
 * Shared task store. Call inside components; state is a module singleton.
 */
export function useTasks() {
  const { t, locale } = useI18n();
  const toast = useToast();
  const ctx = () => ({ t, locale: locale.value, toast });

  const tasks = computed(() => state.tasks);
  const destinations = computed(() => state.destinations);

  const activeCount = computed(() => state.tasks.filter((task) => task.status !== 'completed').length);
  const completedCount = computed(() => state.tasks.filter((task) => task.status === 'completed').length);

  /** Destinations referenced by at least one task, ordered by earliest trip date then first use. */
  const destinationList = computed(() => {
    const earliest = new Map();
    const order = [];
    for (const task of state.tasks) {
      if (!task.destinationKey || !state.destinations[task.destinationKey]) continue;
      if (!earliest.has(task.destinationKey)) {
        earliest.set(task.destinationKey, task.dueDate);
        order.push(task.destinationKey);
      } else {
        const existing = earliest.get(task.destinationKey);
        if (task.dueDate && (!existing || task.dueDate < existing)) earliest.set(task.destinationKey, task.dueDate);
      }
    }
    return order
      .map((key) => ({ ...state.destinations[key], tripDate: earliest.get(key) || null }))
      .sort((a, b) => {
        if (a.tripDate && b.tripDate) return a.tripDate.localeCompare(b.tripDate);
        if (a.tripDate) return -1;
        if (b.tripDate) return 1;
        return 0;
      });
  });

  function addTask(title, options = {}) {
    const clean = title.trim();
    if (!clean) return null;

    const parsed = options.skipDateParsing ? null : parseDateFromText(clean, { locale: locale.value });
    const task = makeTask(clean, {
      dueDate: options.dueDate ?? parsed?.date ?? null,
      dueDateSource: options.dueDate ? 'manual' : 'auto',
      status: options.status,
    });
    state.tasks.unshift(task);
    state.seeded = true;

    if (options.destinationKey && state.destinations[options.destinationKey]) {
      task.destinationKey = options.destinationKey;
      task.detection = 'done';
    } else if (options.skipDetection) {
      task.detection = 'none';
    } else {
      runDetection(task.id, ctx());
    }
    return task;
  }

  /**
   * Add a task for a place that is already known (picked on the globe), so no text detection is needed.
   * The destination is created first, otherwise the orphan cleanup would drop it.
   *
   * @param {import('../store/storage.js').Destination} place  A destination without weather yet.
   * @param {string} title
   */
  function addPlaceTask(place, title) {
    if (!state.destinations[place.key]) {
      state.destinations[place.key] = {
        ...place,
        wiki: place.wiki || null,
        localNames: place.localNames || {},
        weather: null,
        tourist: {},
        climate: {},
        weatherError: false,
      };
    }
    const task = addTask(title, { skipDateParsing: true, destinationKey: place.key });
    ensureEnriched(place.key, ctx());
    return task;
  }

  function updateTitle(taskId, title) {
    const task = findTask(taskId);
    const clean = title.trim();
    if (!task || !clean || clean === task.title) return;

    task.title = clean;
    task.updatedAt = nowIso();

    if (task.dueDateSource !== 'manual') {
      const parsed = parseDateFromText(clean, { locale: locale.value });
      task.dueDate = parsed?.date || null;
      task.dueDateSource = parsed ? 'auto' : null;
    }

    runDetection(taskId, ctx());
  }

  function setDueDate(taskId, isoDate) {
    const task = findTask(taskId);
    if (!task) return;
    task.dueDate = isoDate || null;
    task.dueDateSource = isoDate ? 'manual' : null;
    task.updatedAt = nowIso();
  }

  function setStatus(taskId, status) {
    const task = findTask(taskId);
    if (!task || !TASK_STATUSES.includes(status)) return;
    task.status = status;
    task.updatedAt = nowIso();
  }

  function cycleStatus(taskId) {
    const task = findTask(taskId);
    if (!task) return;
    const index = TASK_STATUSES.indexOf(task.status);
    setStatus(taskId, TASK_STATUSES[(index + 1) % TASK_STATUSES.length]);
  }

  function removeTask(taskId) {
    const index = state.tasks.findIndex((task) => task.id === taskId);
    if (index === -1) return;
    const [removed] = state.tasks.splice(index, 1);
    const snapshot = JSON.parse(JSON.stringify(removed));
    pruneOrphanDestinations(state);

    toast.show(t('toast.deleted'), {
      variant: 'info',
      duration: 6000,
      action: {
        label: t('toast.undo'),
        handler: () => {
          if (findTask(snapshot.id)) return;
          const at = Math.min(index, state.tasks.length);
          state.tasks.splice(at, 0, snapshot);
          if (snapshot.destinationKey && !state.destinations[snapshot.destinationKey]) {
            runDetection(snapshot.id, ctx());
          }
        },
      },
    });
  }

  function retryDetection(taskId) {
    runDetection(taskId, ctx());
  }

  function refreshDestination(key, { force = false } = {}) {
    return ensureEnriched(key, { ...ctx(), force });
  }

  function loadTourist(key) {
    return ensureTourist(key, locale.value);
  }

  function loadTypicalWeather(key, isoDate) {
    return ensureTypicalWeather(key, isoDate);
  }

  function isRefreshing(key) {
    return Boolean(transient.refreshing[key]);
  }

  function isLoadingClimate(key, isoDate) {
    return Boolean(transient.loadingClimate[`${key}|${isoDate}`]);
  }

  function dismissSuggestion(id) {
    if (!state.dismissedSuggestions.includes(id)) state.dismissedSuggestions.push(id);
  }

  function replaceState(next) {
    state.tasks = next.tasks;
    state.destinations = next.destinations;
    state.dismissedSuggestions = next.dismissedSuggestions;
    state.seeded = true;
    refreshStale();
  }

  /** Re-run interrupted detections and refresh stale weather. Called once on startup. */
  function refreshStale() {
    for (const task of state.tasks) {
      if (task.detection === 'pending') runDetection(task.id, ctx());
    }
    for (const key of Object.keys(state.destinations)) {
      ensureEnriched(key, ctx());
    }
  }

  function seedIfEmpty() {
    if (state.seeded || state.tasks.length > 0) return;
    state.seeded = true;
    const samples = [
      { title: t('seed.pack'), status: 'planned' },
      { title: t('seed.visit'), status: 'planned' },
      { title: t('seed.flight'), status: 'in-progress' },
    ];
    for (const sample of samples) addTask(sample.title, { status: sample.status });
  }

  return {
    state,
    tasks,
    destinations,
    destinationList,
    activeCount,
    completedCount,
    todayIso,
    addTask,
    addPlaceTask,
    updateTitle,
    setDueDate,
    setStatus,
    cycleStatus,
    removeTask,
    retryDetection,
    refreshDestination,
    loadTourist,
    loadTypicalWeather,
    isRefreshing,
    isLoadingClimate,
    dismissSuggestion,
    replaceState,
    refreshStale,
    seedIfEmpty,
  };
}
