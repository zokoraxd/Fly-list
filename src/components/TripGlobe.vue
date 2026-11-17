<template>
  <section class="space-y-3" :aria-label="t('map.title')">
    <p class="flex items-center gap-2 px-1 text-sm text-base-content/75">
      <AppIcon name="pin" :size="16" class="text-accent" />
      {{ t('map.hint') }}
    </p>

    <div class="surface sq-lg globe-stage relative h-[70dvh] min-h-[26rem] w-full overflow-hidden lg:h-[36rem]" dir="ltr">
      <!-- MapLibre's stylesheet sets its own position on the map element, so size it from a wrapper. -->
      <div class="absolute inset-0">
        <div ref="container" class="size-full" role="region" :aria-label="t('map.title')"></div>
      </div>

      <p v-if="failure" class="absolute inset-0 z-10 flex items-center justify-center p-6 text-center text-sm text-base-content/80" role="alert">
        {{ failure === 'webgl' ? t('map.noWebgl') : t('map.loadFailed') }}
      </p>

      <template v-else>
        <!-- Physical left/right on purpose: the map controls sit at the right whatever the page direction. -->
        <form
          class="absolute left-3 right-[4.25rem] top-3 z-10 flex gap-2 sm:right-auto sm:w-full sm:max-w-md"
          :dir="isRtl ? 'rtl' : 'ltr'"
          role="search"
          @submit.prevent="search"
        >
          <label class="sr-only" for="globe-search">{{ t('map.searchLabel') }}</label>
          <input
            id="globe-search"
            v-model="query"
            type="search"
            autocomplete="off"
            :autocorrect="isRtl ? 'off' : 'on'"
            :spellcheck="!isRtl"
            :placeholder="t('map.searchPlaceholder')"
            class="surface sq-md min-h-11 min-w-0 flex-1 px-4 text-base shadow-md placeholder:text-base-content/55 focus:border-primary"
          />
          <button type="submit" class="btn btn-primary sq-md min-h-11 px-4 font-medium shadow-md" :disabled="searching">
            <span v-if="searching" class="loading loading-spinner loading-xs" aria-hidden="true"></span>
            {{ t('map.search') }}
          </button>
        </form>

        <article
          v-if="picked"
          class="surface sq-lg absolute inset-x-3 bottom-3 z-20 max-h-[60%] max-w-md space-y-3 overflow-y-auto p-4 shadow-xl sm:max-h-[calc(100%-5.5rem)]"
          :dir="isRtl ? 'rtl' : 'ltr'"
          aria-live="polite"
        >
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <h3 class="truncate text-lg font-semibold">
                <template v-if="picked.status === 'ready'">
                  <span aria-hidden="true">{{ picked.flag }}</span> {{ pickedName }}
                </template>
                <template v-else-if="picked.status === 'loading'">{{ t('map.loading') }}</template>
                <template v-else-if="picked.status === 'water'">{{ t('map.openWater') }}</template>
                <template v-else>{{ t('map.lookupFailed') }}</template>
              </h3>
              <p v-if="picked.status === 'ready'" class="truncate text-sm text-base-content/75">
                {{ [picked.admin1, pickedCountry].filter(Boolean).join(', ') }}
              </p>
            </div>
            <button type="button" class="icon-btn -me-2 -mt-2" :aria-label="t('a11y.closeDialog')" @click="clearPick">
              <AppIcon name="x" :size="18" />
            </button>
          </div>

          <div class="flex flex-wrap gap-2">
            <span class="chip tabular" dir="ltr" :title="t('map.coordinates')">
              <AppIcon name="pin" :size="14" />
              {{ coordinates }}
            </span>
            <span v-if="picked.weather" class="chip tabular" :title="t(`weather.${picked.weather.current.conditionKey}`)">
              <span aria-hidden="true">{{ picked.weather.current.icon }}</span>
              {{ t('map.temperature') }}
              <bdi dir="ltr">{{ picked.weather.current.temperature }}°C</bdi>
            </span>
            <span v-else-if="picked.status === 'loading'" class="skeleton h-7 w-24 rounded-full" aria-hidden="true"></span>
          </div>

          <template v-if="picked.status === 'ready'">
            <div v-if="picked.tourist" class="text-sm leading-relaxed" :dir="picked.tourist.lang === 'ar' ? 'rtl' : 'ltr'">
              <p class="line-clamp-4 text-base-content/85">{{ picked.tourist.extract }}</p>
              <a
                :href="picked.tourist.pageUrl"
                target="_blank"
                rel="noopener noreferrer"
                class="mt-1 inline-flex min-h-9 items-center gap-1 font-medium text-primary hover:underline"
              >
                {{ t('modal.fullGuide') }}
                <AppIcon name="external" :size="14" flip />
              </a>
            </div>
            <div v-else-if="picked.touristLoading" class="space-y-2" aria-hidden="true">
              <span class="skeleton block h-3 w-full"></span>
              <span class="skeleton block h-3 w-4/5"></span>
            </div>
            <button type="button" class="btn btn-primary sq-sm min-h-11 w-full gap-2 font-medium" @click="addToList">
              <AppIcon name="plus" :size="18" />
              {{ t('map.add') }}
            </button>
          </template>
        </article>

        <p
          v-if="searchError"
          class="surface sq-md absolute left-3 right-[4.25rem] top-[4.25rem] z-10 px-3 py-2 text-sm font-medium text-error shadow-md sm:right-auto sm:max-w-md"
          role="alert"
          :dir="isRtl ? 'rtl' : 'ltr'"
        >
          {{ searchError }}
        </p>
      </template>
    </div>
  </section>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { GlobeControl, Map as MapLibreMap, Marker, NavigationControl, setWorkerUrl } from 'maplibre-gl';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url';
import 'maplibre-gl/dist/maplibre-gl.css';
import AppIcon from './AppIcon.vue';
import { useTasks } from '../composables/useTasks.js';
import { useTheme } from '../composables/useTheme.js';
import { useToast } from '../composables/useToast.js';
import { useI18n } from '../i18n/index.js';
import { detectPlace, fetchLocalName, fetchTouristInfo, fetchWeather, findLandmark, makeDestinationKey, reverseGeocode } from '../services/travelApi.js';
import { formatCoordinates, greatCircle, wrapLongitude } from '../utils/geo.js';
import { localizedCountry, localizedName } from '../utils/placeName.js';

const props = defineProps({
  /** Saved destinations with an optional `tripDate`, ordered by trip date. */
  destinations: { type: Array, default: () => [] },
});

const emit = defineEmits(['select-destination']);

const { t, locale } = useI18n();
const { theme } = useTheme();
const { addPlaceTask } = useTasks();
const toast = useToast();

// Free vector styles from OpenFreeMap: no key, no account.
const STYLES = { light: 'https://tiles.openfreemap.org/styles/liberty', dark: 'https://tiles.openfreemap.org/styles/dark' };
const SKY = {
  // fog-ground-blend stays 0 so the haze never washes out the land itself.
  light: {
    'sky-color': '#9cc3ee',
    'horizon-color': '#d6e6f7',
    'fog-color': '#d6e6f7',
    'sky-horizon-blend': 0.4,
    'horizon-fog-blend': 0.3,
    'fog-ground-blend': 0,
  },
  dark: {
    'sky-color': '#1d3d6b',
    'horizon-color': '#2c4f80',
    'fog-color': '#0b1626',
    'sky-horizon-blend': 0.4,
    'horizon-fog-blend': 0.3,
    'fog-ground-blend': 0,
  },
};

// MapLibre finds its worker through import.meta.url, which Vite's dependency bundling breaks. Pointing
// it at the worker file explicitly works in development and in the production build.
setWorkerUrl(workerUrl);

const container = ref(null);
const failure = ref('');
const query = ref('');
const searching = ref(false);
const searchError = ref('');
/** @type {import('vue').Ref<null | Record<string, any>>} */
const picked = ref(null);

const isRtl = computed(() => locale.value === 'ar');
const coordinates = computed(() => (picked.value ? formatCoordinates(picked.value.lat, picked.value.lon) : ''));
const pickedName = computed(() => (picked.value ? localizedName({ name: picked.value.name, localNames: picked.value.localNames }, locale.value) : ''));
const pickedCountry = computed(() => (picked.value ? localizedCountry(picked.value.countryCode, locale.value, picked.value.country) : ''));

let map = null;
let resizeObserver = null;
let pickedMarker = null;
let savedMarkers = [];
let requestId = 0;
let disposed = false;
// True between a style's "style.load" and the next setStyle(). map.isStyleLoaded() is not used for this
// because it also turns false while tiles are downloading.
let styleReady = false;

onMounted(() => {
  try {
    map = new MapLibreMap({
      container: container.value,
      style: STYLES[theme.value] || STYLES.light,
      center: [25, 25],
      zoom: 1.4,
      minZoom: 0.8,
      maxPitch: 0,
      dragRotate: false,
      touchPitch: false,
      pixelRatio: Math.min(window.devicePixelRatio || 1, 2),
      attributionControl: { compact: true },
      cooperativeGestures: true,
      locale: {
        'CooperativeGesturesHandler.WindowsHelpText': t('map.zoomHintDesktop'),
        'CooperativeGesturesHandler.MacHelpText': t('map.zoomHintMac'),
        'CooperativeGesturesHandler.MobileHelpText': t('map.zoomHintMobile'),
      },
    });
  } catch {
    failure.value = 'webgl';
    return;
  }

  map.addControl(new NavigationControl({ showCompass: false, visualizePitch: false }), 'top-right');
  map.addControl(new GlobeControl(), 'top-right');

  map.on('style.load', setupStyle);
  map.on('click', (event) => pick(event.lngLat.lat, event.lngLat.lng));
  map.on('error', (event) => {
    // A failed style or tile download leaves the globe blank; tell the user instead of failing silently.
    if (event?.error?.status === 0 && !map?.isStyleLoaded()) failure.value = failure.value || 'load';
  });

  resizeObserver = new ResizeObserver(() => map?.resize());
  resizeObserver.observe(container.value);

  renderSaved();
  fitSaved(false);
});

onBeforeUnmount(() => {
  disposed = true;
  requestId += 1;
  resizeObserver?.disconnect();
  pickedMarker?.remove();
  savedMarkers.forEach((marker) => marker.remove());
  map?.remove();
  map = null;
});

watch(() => props.destinations, renderSaved, { deep: true });

// A new style (light/dark or label language) has to be loaded; setupStyle then re-applies the globe settings.
watch([theme, locale], () => {
  failure.value = failure.value === 'webgl' ? 'webgl' : '';
  styleReady = false;
  map?.setStyle(STYLES[theme.value] || STYLES.light);
});

/** Runs after every style load: globe projection, atmosphere, localised labels and the route line. */
function setupStyle() {
  if (!map) return;
  failure.value = '';
  styleReady = true;
  map.setProjection({ type: 'globe' });
  map.setSky(SKY[theme.value] || SKY.light);

  if (theme.value === 'dark') applyNightColors();

  if (locale.value === 'ar') {
    const arabicLabel = ['coalesce', ['get', 'name:ar'], ['get', 'name:nonlatin'], ['get', 'name']];
    for (const layer of map.getStyle().layers) {
      if (layer.type === 'symbol' && layer.layout?.['text-field']) map.setLayoutProperty(layer.id, 'text-field', arabicLabel);
    }
  }
  drawRoute();
}

/** The stock dark style is near-black, so land and sea blur together. Recolour it to the navy night chart. */
function applyNightColors() {
  const paint = {
    background: ['background-color', '#22364f'],
    water: ['fill-color', '#0f1c2e'],
    waterway: ['line-color', '#0f1c2e'],
    landcover_wood: ['fill-color', '#2a415c'],
    landuse_park: ['fill-color', '#2a415c'],
    boundary_state: ['line-color', '#47617f'],
    'boundary_country_z0-4': ['line-color', '#6f89ab'],
    'boundary_country_z5-': ['line-color', '#6f89ab'],
  };
  for (const [id, [property, value]] of Object.entries(paint)) {
    if (map.getLayer(id)) map.setPaintProperty(id, property, value);
  }
}

function routeColor() {
  return getComputedStyle(document.documentElement).getPropertyValue('--route').trim() || '#a8286f';
}

function drawRoute() {
  if (!map || !styleReady) return;
  const coords = props.destinations.filter(hasCoordinates);
  const lines = [];
  for (let i = 0; i < coords.length - 1; i++) {
    lines.push(greatCircle([coords[i].latitude, coords[i].longitude], [coords[i + 1].latitude, coords[i + 1].longitude]));
  }
  const data = {
    type: 'FeatureCollection',
    features: lines.map((line) => ({ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: line } })),
  };

  const source = map.getSource('route');
  if (source) {
    source.setData(data);
    map.setPaintProperty('route', 'line-color', routeColor());
    return;
  }
  map.addSource('route', { type: 'geojson', data });
  map.addLayer({
    id: 'route',
    type: 'line',
    source: 'route',
    layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: { 'line-color': routeColor(), 'line-width': 3, 'line-opacity': 0.9, 'line-dasharray': [0.1, 2] },
  });
}

function hasCoordinates(destination) {
  return Number.isFinite(destination?.latitude) && Number.isFinite(destination?.longitude);
}

/** Numbered pins for saved destinations. Each is a real button, so keyboard users can open it too. */
function renderSaved() {
  if (!map) return;
  savedMarkers.forEach((marker) => marker.remove());
  savedMarkers = [];

  props.destinations.filter(hasCoordinates).forEach((destination, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'globe-pin';
    button.textContent = String(index + 1);
    button.setAttribute('aria-label', localizedName(destination, locale.value));
    button.addEventListener('click', (event) => {
      event.stopPropagation();
      emit('select-destination', destination.key);
    });
    savedMarkers.push(new Marker({ element: button }).setLngLat([destination.longitude, destination.latitude]).addTo(map));
  });

  drawRoute();
}

function fitSaved(animate = true) {
  const coords = props.destinations.filter(hasCoordinates);
  if (!map || coords.length === 0) return;
  if (coords.length === 1) {
    map.easeTo({ center: [coords[0].longitude, coords[0].latitude], zoom: 3, duration: animate ? 800 : 0 });
    return;
  }
  const lngs = coords.map((c) => c.longitude);
  const lats = coords.map((c) => c.latitude);
  map.fitBounds(
    [
      [Math.min(...lngs), Math.min(...lats)],
      [Math.max(...lngs), Math.max(...lats)],
    ],
    { padding: 80, maxZoom: 4, duration: animate ? 800 : 0 },
  );
}

function setPickedMarker(lat, lon) {
  pickedMarker?.remove();
  const el = document.createElement('div');
  el.className = 'globe-picked';
  el.setAttribute('aria-hidden', 'true');
  pickedMarker = new Marker({ element: el }).setLngLat([lon, lat]).addTo(map);
}

function clearPick() {
  requestId += 1;
  picked.value = null;
  pickedMarker?.remove();
  pickedMarker = null;
}

/**
 * Pick a point: drop a marker, fly there, then look up its name, weather and a short guide.
 * Stale lookups (the user clicked somewhere else meanwhile) are ignored.
 *
 * @param {number} lat
 * @param {number} lon
 * @param {{ name?: string }} [hint]  A known name (from search) that replaces the reverse-geocoded one.
 */
async function pick(lat, lon, hint = {}) {
  if (!map) return;
  const id = ++requestId;
  const longitude = wrapLongitude(lon);
  searchError.value = '';

  picked.value = { status: 'loading', lat, lon: longitude, weather: null, tourist: null, touristLoading: false };
  setPickedMarker(lat, longitude);
  map.flyTo({ center: [longitude, lat], zoom: Math.max(map.getZoom(), 3.5), speed: 1.2 });

  const weatherPromise = fetchWeather(lat, longitude).catch(() => null);

  let place;
  try {
    place = await reverseGeocode(lat, longitude);
  } catch {
    if (id !== requestId) return;
    picked.value = { ...picked.value, status: 'error' };
    return;
  }
  if (id !== requestId) return;

  if (!place && !hint.name) {
    picked.value = { ...picked.value, status: 'water', weather: await weatherPromise };
    return;
  }

  const base = {
    name: hint.name || place.name,
    country: place?.country || '',
    countryCode: place?.countryCode || '',
    flag: place?.flag || '🌐',
    admin1: place?.admin1 || '',
  };
  picked.value = { ...picked.value, ...base, status: 'ready', localNames: {}, touristLoading: true };

  const [weather, tourist] = await Promise.all([
    weatherPromise,
    fetchTouristInfo({ name: base.name, country: base.country, admin1: base.admin1 }, { locale: locale.value }).catch(() => null),
  ]);
  if (id !== requestId) return;

  // Arabic name: the Wikipedia article title when it exists, otherwise the geocoder's Arabic name.
  const localNames = {};
  if (locale.value === 'ar') {
    const fromWiki = hint.localName || (tourist?.lang === 'ar' ? tourist.title.replace(/\s*\(.*\)\s*$/, '') : null);
    // A landmark has no city-level name to look up, so only a plain place goes to the geocoder.
    const arabic = fromWiki || (hint.name ? null : await fetchLocalName({ name: base.name, countryCode: base.countryCode, latitude: lat, longitude }, 'ar'));
    if (id !== requestId) return;
    if (arabic) localNames.ar = arabic;
  }

  picked.value = { ...picked.value, weather, tourist, touristLoading: false, localNames };
}

async function search() {
  const text = query.value.trim();
  if (!text || searching.value) return;
  searching.value = true;
  searchError.value = '';
  try {
    // City or country first (the local list, then the geocoder), then landmarks through Wikipedia.
    const place = await detectPlace(text);
    if (place) {
      await pick(place.latitude, place.longitude);
      return;
    }
    const landmark = await findLandmark(text, /[؀-ۿ]/.test(text) ? 'ar' : 'en');
    if (landmark) {
      await pick(landmark.latitude, landmark.longitude, { name: landmark.name, localName: landmark.localName });
      return;
    }
    searchError.value = t('map.searchFail', { query: text });
  } finally {
    if (!disposed) searching.value = false;
  }
}

function addToList() {
  const p = picked.value;
  if (!p || p.status !== 'ready') return;
  const place = {
    key: makeDestinationKey({ name: p.name, countryCode: p.countryCode }),
    name: p.name,
    country: p.country,
    countryCode: p.countryCode,
    flag: p.flag,
    latitude: p.lat,
    longitude: p.lon,
    timezone: p.weather?.timezone || null,
    admin1: p.admin1,
    wiki: null,
    source: 'geocode',
    localNames: p.localNames || {},
  };
  const display = localizedName(place, locale.value);
  addPlaceTask(place, t('map.tripTo', { name: display }));
  toast.success(t('map.added', { name: display }));
  clearPick();
}
</script>

<style>
.globe-stage {
  background: oklch(var(--b3));
}
[data-theme='dark'] .globe-stage {
  background: oklch(var(--b2));
}
.globe-stage .maplibregl-ctrl-group {
  border-radius: 12px;
  overflow: hidden;
  background: oklch(var(--b1));
  box-shadow: 0 1px 4px rgb(0 0 0 / 0.25);
}
.globe-stage .maplibregl-ctrl-group button {
  width: 40px;
  height: 40px;
}
/* Control icons are dark artwork; flip them on the night chart, and keep the globe icon blue. */
[data-theme='dark'] .globe-stage .maplibregl-ctrl-group button .maplibregl-ctrl-icon {
  filter: invert(1);
}
[data-theme='dark'] .globe-stage .maplibregl-ctrl-group button.maplibregl-ctrl-globe .maplibregl-ctrl-icon,
[data-theme='dark'] .globe-stage .maplibregl-ctrl-group button.maplibregl-ctrl-globe-enabled .maplibregl-ctrl-icon {
  filter: invert(1) hue-rotate(180deg);
}
.globe-stage .maplibregl-canvas {
  outline: none;
}
/* Phone-sized tap targets (44px) without changing how the pins and buttons look. */
@media (max-width: 640px) {
  .globe-stage .maplibregl-ctrl-group button {
    width: 44px;
    height: 44px;
  }
}
.globe-pin {
  position: relative;
}
.globe-pin::after {
  content: '';
  position: absolute;
  inset: -6px;
}
.globe-pin {
  width: 32px;
  height: 32px;
  border-radius: 9999px;
  background: oklch(var(--p));
  color: oklch(var(--pc));
  border: 2px solid oklch(var(--b1));
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  box-shadow: 0 2px 6px rgb(0 0 0 / 0.35);
  cursor: pointer;
}
.globe-picked {
  width: 22px;
  height: 22px;
  border-radius: 9999px;
  background: var(--route);
  border: 3px solid #fff;
  box-shadow:
    0 0 0 0 var(--route),
    0 2px 8px rgb(0 0 0 / 0.4);
  animation: globe-pulse 1.8s ease-out infinite;
}
@keyframes globe-pulse {
  0% {
    box-shadow:
      0 0 0 0 color-mix(in srgb, var(--route) 55%, transparent),
      0 2px 8px rgb(0 0 0 / 0.4);
  }
  100% {
    box-shadow:
      0 0 0 18px transparent,
      0 2px 8px rgb(0 0 0 / 0.4);
  }
}
@media (prefers-reduced-motion: reduce) {
  .globe-picked {
    animation: none;
  }
}
</style>
