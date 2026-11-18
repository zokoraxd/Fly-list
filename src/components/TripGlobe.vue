<template>
  <section class="relative w-full" :aria-label="t('map.title')">
    <div ref="stageEl" class="globe-stage relative h-[68dvh] min-h-[26rem] w-full overflow-hidden md:h-[calc(100dvh-5.5rem)] md:min-h-[38rem]" dir="ltr">
      <div ref="container" class="size-full select-none" role="region" :aria-label="t('map.title')"></div>

      <p v-if="failure" class="absolute inset-0 z-10 flex items-center justify-center p-6 text-center text-sm text-base-content/80" role="alert">
        {{ failure === 'webgl' ? t('map.noWebgl') : t('map.loadFailed') }}
      </p>

      <template v-else>
        <!-- Projected place names from OpenFreeMap + local gazetteer (physical canvas coordinates) -->
        <div class="pointer-events-none absolute inset-0 z-[5] overflow-hidden" aria-label="Earth places">
          <!-- rtl-ready-ignore-start: WebGL NDC-to-screen projection always uses physical left/top pixel coordinates -->
          <button
            v-for="label in visibleLabels"
            :key="label.id"
            type="button"
            class="earth-label pointer-events-auto absolute -translate-x-1/2 -translate-y-1/2 rounded-full px-1.5 py-0.5 whitespace-nowrap focus-visible:ring-2 focus-visible:ring-primary"
            :class="[
              label.kind === 'country'
                ? 'text-xs font-semibold tracking-wide rtl:tracking-normal text-slate-900 dark:text-sky-100'
                : 'inline-flex items-center gap-1 text-xs font-medium text-primary dark:text-cyan-300',
              label.isSaved ? 'ring-1 ring-accent/70 bg-base-100/80' : '',
            ]"
            :style="{ left: `${label.x}px`, top: `${label.y}px` }"
            :dir="isRtl ? 'rtl' : 'ltr'"
            @mouseenter="onLabelEnter(label)"
            @mouseleave="onLabelLeave"
            @click="onLabelClick(label)"
          >
            <span v-if="label.kind === 'city'" class="size-1.5 shrink-0 rounded-full bg-current opacity-85" aria-hidden="true"></span>
            <span class="max-w-[26ch] truncate">{{ isRtl ? label.nameAr : label.nameEn }}</span>
          </button>
          <!-- rtl-ready-ignore-end -->
        </div>

        <!-- Top-left floating badge + search bar -->
        <div class="absolute start-3 end-14 top-2.5 z-10 flex flex-wrap items-center gap-2 sm:end-auto" :dir="isRtl ? 'rtl' : 'ltr'">
          <span class="sq-sm inline-flex h-10 items-center bg-primary px-3 text-xs font-bold tracking-wide rtl:tracking-normal text-primary-content shadow-md">
            {{ t('map.badge3d') }}
          </span>
          <form class="flex min-w-0 flex-1 gap-1.5 sm:w-72 sm:flex-none" role="search" @submit.prevent="search">
            <label class="sr-only" for="globe-search">{{ t('map.searchLabel') }}</label>
            <input
              id="globe-search"
              v-model="query"
              type="search"
              dir="auto"
              autocomplete="off"
              :autocorrect="isRtl ? 'off' : 'on'"
              :spellcheck="!isRtl"
              :placeholder="t('map.searchPlaceholder')"
              class="surface sq-md min-h-10 min-w-0 flex-1 bg-base-100/95 px-3.5 text-sm shadow-md placeholder:text-base-content/65 focus:border-primary"
            />
            <button type="submit" class="btn btn-primary sq-md min-h-10 px-3.5 text-sm font-semibold shadow-md" :disabled="searching">
              <span v-if="searching" class="loading loading-spinner loading-xs" aria-hidden="true"></span>
              {{ t('map.search') }}
            </button>
          </form>
        </div>

        <!-- Top-right controls: Auto-Orient, Zoom In, Zoom Out -->
        <div class="absolute end-3 top-2.5 z-10 flex flex-col items-end gap-1.5" :dir="isRtl ? 'rtl' : 'ltr'">
          <button
            type="button"
            class="surface sq-md inline-flex h-10 items-center gap-1.5 bg-base-100/95 px-3 text-xs font-semibold text-base-content shadow-md transition-colors hover:border-primary hover:text-primary"
            :aria-label="t('map.autoOrient')"
            :title="t('map.autoOrient')"
            @click="autoOrient"
          >
            <AppIcon name="orient" :size="16" />
            <span class="hidden sm:inline">{{ t('map.autoOrient') }}</span>
          </button>

          <div class="surface sq-md flex flex-col overflow-hidden bg-base-100/95 shadow-md">
            <button
              type="button"
              class="inline-flex size-9 items-center justify-center text-base-content transition-colors hover:bg-base-200 hover:text-primary"
              :aria-label="t('map.zoomIn')"
              :title="t('map.zoomIn')"
              @click="zoomBy(-0.4)"
            >
              <AppIcon name="plus" :size="16" />
            </button>
            <button
              type="button"
              class="inline-flex size-9 items-center justify-center border-t border-base-300/60 text-base-content transition-colors hover:bg-base-200 hover:text-primary"
              :aria-label="t('map.zoomOut')"
              :title="t('map.zoomOut')"
              @click="zoomBy(0.4)"
            >
              <AppIcon name="minus" :size="16" />
            </button>
          </div>
        </div>

        <!-- rtl-ready-ignore-next-line: physical centered hint pill on LTR globe stage -->
        <p
          v-if="!picked"
          class="pointer-events-none absolute bottom-2.5 left-1/2 z-10 hidden -translate-x-1/2 whitespace-nowrap rounded-full border border-base-300/60 bg-base-100/90 px-3.5 py-1 text-xs font-medium text-base-content/80 shadow-sm sm:block"
          :dir="isRtl ? 'rtl' : 'ltr'"
        >
          {{ t('map.hint') }}
        </p>

        <!-- Pin hover tooltip (physical canvas coordinates) -->
        <!-- rtl-ready-ignore-start: WebGL screen-space projection always measures from physical left -->
        <div
          v-if="hoveredTooltip"
          class="surface sq-sm pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-full border-primary/60 bg-base-100/95 px-2.5 py-1 text-xs font-medium shadow-lg whitespace-nowrap"
          :style="{ left: `${hoveredTooltip.x}px`, top: `${hoveredTooltip.y - 14}px` }"
          :dir="isRtl ? 'rtl' : 'ltr'"
        >
          <span aria-hidden="true">{{ hoveredTooltip.flag }}</span>
          {{ hoveredTooltip.name }}
          <span v-if="hoveredTooltip.temp !== null" class="ms-1.5 text-primary tabular">
            <bdi dir="ltr">{{ hoveredTooltip.temp }}°C</bdi>
          </span>
        </div>
        <!-- rtl-ready-ignore-end -->

        <!-- Floating Place Info popup -->
        <article
          v-if="picked"
          class="surface sq-lg absolute inset-x-3 bottom-3 z-20 max-h-[60%] max-w-sm space-y-3 overflow-y-auto border-primary/50 bg-base-100/95 p-4 shadow-2xl sm:max-h-[calc(100%-5.5rem)]"
          :dir="isRtl ? 'rtl' : 'ltr'"
          aria-live="polite"
        >
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <h3 class="truncate text-base font-semibold">
                <template v-if="picked.status === 'ready'">
                  <span aria-hidden="true">{{ picked.flag }}</span> {{ t('map.countryInfo', { name: pickedName }) }}
                </template>
                <template v-else-if="picked.status === 'loading'">{{ t('map.loading') }}</template>
                <template v-else-if="picked.status === 'water'">{{ t('map.openWater') }}</template>
                <template v-else>{{ t('map.lookupFailed') }}</template>
              </h3>
              <p v-if="picked.status === 'ready'" class="mt-0.5 truncate text-xs font-medium text-primary">
                {{ t('map.selectedVia') }}
                <span v-if="pickedCountry" class="text-base-content/75"> ({{ [picked.admin1, pickedCountry].filter(Boolean).join(', ') }})</span>
              </p>
            </div>
            <button type="button" class="icon-btn -me-2 -mt-2" :aria-label="t('a11y.closeDialog')" @click="clearPick">
              <AppIcon name="x" :size="18" />
            </button>
          </div>

          <div class="flex flex-wrap gap-1.5">
            <span class="chip tabular" dir="ltr" :title="t('map.coordinates')">
              <AppIcon name="pin" :size="13" />
              {{ coordinates }}
            </span>
            <span v-if="picked.weather" class="chip tabular" :title="t(`weather.${picked.weather.current.conditionKey}`)">
              <span aria-hidden="true">{{ picked.weather.current.icon }}</span>
              {{ t('map.temperature') }}:
              <bdi dir="ltr">{{ picked.weather.current.temperature }}°C</bdi>
            </span>
            <span v-else-if="picked.status === 'loading'" class="skeleton h-6 w-24 rounded-full" aria-hidden="true"></span>
          </div>

          <template v-if="picked.status === 'ready'">
            <div v-if="picked.tourist" class="text-xs leading-relaxed" :dir="picked.tourist.lang === 'ar' ? 'rtl' : 'ltr'">
              <p class="line-clamp-3 text-base-content/85">{{ picked.tourist.extract }}</p>
              <a
                :href="picked.tourist.pageUrl"
                target="_blank"
                rel="noopener noreferrer"
                class="mt-1.5 inline-flex min-h-8 items-center gap-1 font-medium text-primary hover:underline"
              >
                {{ t('modal.fullGuide') }}
                <AppIcon name="external" :size="13" flip />
              </a>
            </div>
            <div v-else-if="picked.touristLoading" class="space-y-2" aria-hidden="true">
              <span class="skeleton block h-2.5 w-full"></span>
              <span class="skeleton block h-2.5 w-4/5"></span>
            </div>

            <div class="flex items-center gap-2 pt-0.5">
              <button type="button" class="btn btn-primary btn-sm sq-sm min-h-10 flex-1 gap-2 text-sm font-semibold" @click="syncToList">
                <AppIcon name="refresh" :size="16" />
                {{ t('map.sync') }}
              </button>
              <button
                v-if="picked.savedKey"
                type="button"
                class="btn btn-ghost btn-sm sq-sm min-h-10 px-3 text-xs"
                :title="t('map.details')"
                :aria-label="t('map.details')"
                @click="emit('open-destination', picked.savedKey)"
              >
                <AppIcon name="external" :size="15" flip />
              </button>
            </div>
          </template>
        </article>

        <p
          v-if="searchError"
          class="surface sq-md absolute start-3 end-14 top-14 z-10 bg-base-100/95 px-3 py-2 text-xs font-medium text-error shadow-md sm:end-auto sm:max-w-sm"
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
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import AppIcon from './AppIcon.vue';
import { useTasks } from '../composables/useTasks.js';
import { useTheme } from '../composables/useTheme.js';
import { useToast } from '../composables/useToast.js';
import { useI18n } from '../i18n/index.js';
import { fetchOpenFreeMapCitiesNear, fetchOpenFreeMapCountries, getLocalGlobeLabels } from '../services/globePlaces.js';
import { detectPlace, fetchLocalName, fetchTouristInfo, fetchWeather, findLandmark, makeDestinationKey, reverseGeocode } from '../services/travelApi.js';
import { formatCoordinates, latLonToVector3, vector3ToLatLon, wrapLongitude } from '../utils/geo.js';
import {
  buildAtmosphere,
  buildBorderLines,
  buildEarthTexture,
  buildFlightArcs,
  buildGraticule,
  buildPinMarker,
  buildStarfield,
  disposeObject3D,
  getGlobePalette,
} from '../utils/globeScene.js';
import { localizedCountry, localizedName } from '../utils/placeName.js';

const props = defineProps({
  /** Saved destinations with an optional `tripDate`, ordered by trip date. */
  destinations: { type: Array, default: () => [] },
  /** Currently focused destination key from the To-Do List. */
  selectedDestinationKey: { type: String, default: null },
});

const emit = defineEmits(['open-destination', 'sync-destination']);

const { t, locale } = useI18n();
const { theme } = useTheme();
const { addPlaceTask, loadTourist, refreshDestination } = useTasks();
const toast = useToast();

const stageEl = ref(null);
const container = ref(null);
const failure = ref('');
const query = ref('');
const searching = ref(false);
const searchError = ref('');
/** @type {import('vue').Ref<null | Record<string, any>>} */
const picked = ref(null);
const hoveredKey = ref(null);
const hoveredLabelId = ref(null);
const hoveredTooltip = ref(null);
const visibleLabels = ref([]);

const isRtl = computed(() => locale.value === 'ar');
const coordinates = computed(() => (picked.value ? formatCoordinates(picked.value.lat, picked.value.lon) : ''));
const pickedName = computed(() => (picked.value ? localizedName({ name: picked.value.name, localNames: picked.value.localNames }, locale.value) : ''));
const pickedCountry = computed(() => (picked.value ? localizedCountry(picked.value.countryCode, locale.value, picked.value.country) : ''));

const EARTH_RADIUS = 1;
const DEFAULT_DIST = 2.2;
const FOCUS_DIST = 1.92;

let renderer = null;
let scene = null;
let camera = null;
let controls = null;
let earthMesh = null;
let bordersObj = null;
let gridObj = null;
let atmosphereObj = null;
let starsObj = null;
let pinsGroup = null;
let arcsGroup = null;
let pickedMarker = null;
let resizeObserver = null;
let rafId = 0;
let idleResumeTimer = null;
let userInteracting = false;
let requestId = 0;
let disposed = false;
let userLocation = null;
let cameraFlight = null;

/** OpenFreeMap + local gazetteer labels cache. */
const labelMap = new Map();
let labelPool = [];
let labelsDirty = true;
const lastCamPos = new THREE.Vector3(Infinity, Infinity, Infinity);
let lastCityTileCheck = 0;

/** Saved pin descriptors for raycasting and animation. */
let pinEntries = [];
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const downPos = { x: 0, y: 0 };

const prefersReducedMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function hasCoordinates(destination) {
  return Number.isFinite(destination?.latitude) && Number.isFinite(destination?.longitude);
}

function directionFor(lat, lon) {
  const [x, y, z] = latLonToVector3(lat, lon, 1);
  return new THREE.Vector3(x, y, z).normalize();
}

function mergeLabels(items) {
  let changed = false;
  for (const item of items) {
    const key = `${item.kind}:${item.nameEn.toLowerCase()}`;
    if (!labelMap.has(key)) {
      labelMap.set(key, { ...item, normal: directionFor(item.lat, item.lon) });
      changed = true;
    } else if (item.id.startsWith('ofm:')) {
      // Prefer OpenFreeMap coordinates/Arabic names over static fallback for countries.
      const prev = labelMap.get(key);
      labelMap.set(key, {
        ...prev,
        ...item,
        nameAr: item.nameAr || prev.nameAr,
        normal: directionFor(item.lat, item.lon),
      });
      changed = true;
    }
  }
  if (changed) {
    labelPool = [...labelMap.values()].sort((a, b) => {
      if (a.kind !== b.kind) return a.kind === 'country' ? -1 : 1;
      return a.rank - b.rank;
    });
    labelsDirty = true;
  }
}

async function initPlaceLabels() {
  mergeLabels(getLocalGlobeLabels());
  const countries = await fetchOpenFreeMapCountries();
  if (!disposed && countries.length > 0) mergeLabels(countries);
}

function maybeFetchZoomCities() {
  if (!camera || disposed) return;
  const dist = camera.position.length();
  if (dist > 2.05) return;
  const now = performance.now();
  if (now - lastCityTileCheck < 450) return;
  lastCityTileCheck = now;

  const { lat, lon } = vector3ToLatLon(camera.position.x, camera.position.y, camera.position.z);
  fetchOpenFreeMapCitiesNear(lat, lon).then((cities) => {
    if (!disposed && cities.length > 0) mergeLabels(cities);
  });
}

function updateProjectedLabels() {
  const el = container.value;
  if (!el || !camera) return;
  const w = el.clientWidth;
  const h = el.clientHeight;
  if (w === 0 || h === 0) return;

  const dist = camera.position.length();
  const camDir = camera.position.clone().normalize();
  const showAllCities = dist < 2.02;
  const showMajorCities = dist < 2.35;
  const maxLabels = showAllCities ? 34 : 24;
  const rtl = isRtl.value;

  const placed = [];
  const nextVisible = [];
  const savedKeys = new Set(props.destinations.map((d) => d.name.toLowerCase()));

  // Reserve pin zones first so place labels don't sit right on top of active pins.
  const pinBoxes = [];
  for (const pin of pinEntries) {
    const n = pin.group.position.clone().normalize();
    if (n.dot(camDir) < 0.2) continue;
    const p = pin.group.position.clone().multiplyScalar(1.03).project(camera);
    const px = ((p.x + 1) / 2) * w;
    const py = ((-p.y + 1) / 2) * h;
    pinBoxes.push({ x: px, y: py, w: 34, h: 16 });
  }

  const tryPlace = (item, isSaved = false) => {
    if (nextVisible.length >= maxLabels) return;
    if (item.normal.dot(camDir) < 0.28) return;

    const proj = item.normal.clone().multiplyScalar(1.005).project(camera);
    if (proj.z > 1) return;

    const x = ((proj.x + 1) / 2) * w;
    const y = ((-proj.y + 1) / 2) * h;
    const textLen = Math.min(26, (rtl ? item.nameAr : item.nameEn).length);
    const halfW = Math.max(24, textLen * (rtl ? 3.8 : 4.2) + (item.kind === 'city' ? 14 : 10));
    const halfH = 11;

    // Keep clear of viewport edges, top search bar, Auto-Orient/zoom stack, and bottom hint pill.
    if (x - halfW < 14 || x + halfW > w - 14) return;
    const topSafe = w < 640 ? 112 : 66;
    if (y - halfH < topSafe) return;
    if (y - halfH < 148 && (rtl ? x - halfW < 156 : x + halfW > w - 156)) return;
    if (!picked.value && y + halfH > h - 44) return;
    if (picked.value && y + halfH > h - 14) return;

    for (const pb of pinBoxes) {
      if (Math.abs(x - pb.x) < halfW + pb.w && Math.abs(y - pb.y) < halfH + pb.h) return;
    }
    for (const box of placed) {
      if (Math.abs(x - box.x) < halfW + box.halfW + 12 && Math.abs(y - box.y) < halfH + box.halfH + 8) return;
    }

    placed.push({ x, y, halfW, halfH });
    nextVisible.push({
      id: item.id,
      kind: item.kind,
      nameEn: item.nameEn,
      nameAr: item.nameAr,
      lat: item.lat,
      lon: item.lon,
      isSaved,
      x: Math.round(x * 10) / 10,
      y: Math.round(y * 10) / 10,
    });
  };

  // Saved trip destinations get top priority on the globe.
  for (const dest of props.destinations.filter(hasCoordinates)) {
    tryPlace(
      {
        id: `saved:${dest.key}`,
        kind: 'city',
        nameEn: dest.name,
        nameAr: dest.localNames?.ar || dest.name,
        lat: dest.latitude,
        lon: dest.longitude,
        normal: directionFor(dest.latitude, dest.longitude),
      },
      true,
    );
  }

  for (const item of labelPool) {
    if (nextVisible.length >= maxLabels) break;
    if (savedKeys.has(item.nameEn.toLowerCase())) continue;
    if (item.kind === 'city') {
      if (!showMajorCities) continue;
      if (!showAllCities && item.rank > 3) continue;
    }
    tryPlace(item, false);
  }

  visibleLabels.value = nextVisible;
}

function onLabelEnter(label) {
  hoveredLabelId.value = label.id;
  updateAutoRotate();
}

function onLabelLeave() {
  hoveredLabelId.value = null;
  updateAutoRotate();
}

function onLabelClick(label) {
  hoveredLabelId.value = null;
  pick(label.lat, label.lon, { name: label.nameEn, localName: label.nameAr });
}

function flyToCoords(lat, lon, targetDist = FOCUS_DIST, animate = true) {
  if (!camera || !controls) return;
  const endDir = directionFor(lat, lon);
  const clampedDist = Math.max(controls.minDistance, Math.min(controls.maxDistance, targetDist));

  if (!animate || prefersReducedMotion) {
    cameraFlight = null;
    camera.position.copy(endDir.multiplyScalar(clampedDist));
    camera.lookAt(0, 0, 0);
    controls.update();
    labelsDirty = true;
    return;
  }

  cameraFlight = {
    startDir: camera.position.clone().normalize(),
    endDir,
    startDist: camera.position.length(),
    endDist: clampedDist,
    startTime: performance.now(),
    duration: 750,
  };
}

function flyToDestination(destination, animate = true) {
  if (!hasCoordinates(destination)) return;
  flyToCoords(destination.latitude, destination.longitude, FOCUS_DIST, animate);
}

function zoomBy(delta) {
  if (!camera || !controls) return;
  cameraFlight = null;
  const currentDist = camera.position.length();
  const nextDist = Math.max(controls.minDistance, Math.min(controls.maxDistance, currentDist + delta));
  const dir = camera.position.clone().normalize();
  camera.position.copy(dir.multiplyScalar(nextDist));
  controls.update();
  labelsDirty = true;
}

function initScene() {
  const el = container.value;
  if (!el) return;

  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  } catch {
    failure.value = 'webgl';
    return;
  }

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(el.clientWidth || 640, el.clientHeight || 520);
  el.appendChild(renderer.domElement);

  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(42, (el.clientWidth || 640) / (el.clientHeight || 520), 0.1, 20);

  const initialFocus =
    (props.selectedDestinationKey && props.destinations.find((d) => d.key === props.selectedDestinationKey)) || props.destinations.find(hasCoordinates);
  const initDir = initialFocus ? directionFor(initialFocus.latitude, initialFocus.longitude) : directionFor(25, 25);
  camera.position.copy(initDir.multiplyScalar(DEFAULT_DIST));

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.06;
  controls.enablePan = false;
  controls.rotateSpeed = 0.65;
  controls.zoomSpeed = 0.8;
  controls.minDistance = 1.45;
  controls.maxDistance = 3.4;
  controls.autoRotate = !prefersReducedMotion;
  controls.autoRotateSpeed = 0.4;

  controls.addEventListener('start', () => {
    userInteracting = true;
    cameraFlight = null;
    clearTimeout(idleResumeTimer);
  });
  controls.addEventListener('end', () => {
    userInteracting = false;
    clearTimeout(idleResumeTimer);
    idleResumeTimer = setTimeout(() => {
      updateAutoRotate();
    }, 2200);
  });

  // Brighter lighting so landmasses and borders pop clearly while keeping 3D spherical depth.
  scene.add(new THREE.AmbientLight('#ffffff', 1.75));
  const keyLight = new THREE.DirectionalLight('#e0f2fe', 1.55);
  keyLight.position.set(4, 3, 4);
  scene.add(keyLight);

  const rimLight = new THREE.DirectionalLight('#67e8f9', 0.75);
  rimLight.position.set(-4, -2, -3);
  scene.add(rimLight);

  earthMesh = new THREE.Mesh(
    new THREE.SphereGeometry(EARTH_RADIUS, 64, 64),
    new THREE.MeshPhongMaterial({
      map: buildEarthTexture(theme.value),
      shininess: 18,
      specular: new THREE.Color('#38bdf8'),
    }),
  );
  scene.add(earthMesh);

  starsObj = buildStarfield(750, theme.value);
  gridObj = buildGraticule(1.0015, theme.value);
  bordersObj = buildBorderLines(1.003, theme.value);
  atmosphereObj = buildAtmosphere(1.14, theme.value);
  pinsGroup = new THREE.Group();
  arcsGroup = new THREE.Group();

  scene.add(starsObj, gridObj, bordersObj, atmosphereObj, arcsGroup, pinsGroup);

  renderSaved();
  initPlaceLabels();

  const canvas = renderer.domElement;
  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerup', onPointerUp);
  canvas.addEventListener('pointerleave', onPointerLeave);
  canvas.addEventListener('dblclick', onDoubleClick);

  resizeObserver = new ResizeObserver(handleResize);
  resizeObserver.observe(el);

  startLoop();
}

function handleResize() {
  const el = container.value;
  if (!el || !renderer || !camera) return;
  const w = el.clientWidth;
  const h = el.clientHeight;
  if (w === 0 || h === 0) return;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
  labelsDirty = true;
}

function updateAutoRotate() {
  if (!controls) return;
  controls.autoRotate = !prefersReducedMotion && !userInteracting && !hoveredKey.value && !hoveredLabelId.value && !picked.value && !cameraFlight;
}

function applyThemeMaterials() {
  if (!scene || !earthMesh) return;
  const palette = getGlobePalette(theme.value);

  if (earthMesh.material.map) earthMesh.material.map.dispose();
  earthMesh.material.map = buildEarthTexture(theme.value);
  earthMesh.material.specular = new THREE.Color(theme.value === 'light' ? '#93c5fd' : '#38bdf8');
  earthMesh.material.needsUpdate = true;

  if (bordersObj) {
    bordersObj.material.color.set(palette.borderColor);
    bordersObj.material.opacity = palette.borderOpacity;
  }
  if (gridObj) {
    gridObj.material.color.set(palette.gridColor);
    gridObj.material.opacity = palette.gridOpacity;
  }
  if (atmosphereObj) {
    atmosphereObj.material.uniforms.uColor.value.set(palette.haloColor);
    atmosphereObj.material.uniforms.uIntensity.value = theme.value === 'light' ? 0.55 : 0.95;
  }
  if (starsObj) {
    starsObj.material.opacity = theme.value === 'light' ? 0.18 : 0.9;
  }
  renderSaved();
}

function renderSaved() {
  if (!pinsGroup || !arcsGroup) return;
  const palette = getGlobePalette(theme.value);

  disposeObject3D(pinsGroup);
  pinsGroup.clear();
  pinEntries = [];

  props.destinations.filter(hasCoordinates).forEach((destination, index) => {
    const isActive = destination.key === props.selectedDestinationKey;
    const color = isActive ? palette.pinActive : palette.pinDefault;
    const pin = buildPinMarker({
      lat: destination.latitude,
      lon: destination.longitude,
      color,
      phase: index * 0.9,
    });
    pinsGroup.add(pin.group);
    pinEntries.push({ ...pin, destination, isActive });
  });

  disposeObject3D(arcsGroup);
  arcsGroup.clear();
  const nextArcs = buildFlightArcs(props.destinations, palette.routeColor);
  while (nextArcs.children.length > 0) {
    arcsGroup.add(nextArcs.children[0]);
  }
  labelsDirty = true;
}

function updatePickedPin(lat, lon) {
  if (!scene) return;
  if (pickedMarker) {
    scene.remove(pickedMarker.group);
    disposeObject3D(pickedMarker.group);
    pickedMarker = null;
  }
  if (lat === null || lon === null) return;
  const palette = getGlobePalette(theme.value);
  pickedMarker = buildPinMarker({ lat, lon, color: palette.pinPicked, radius: 1.008 });
  scene.add(pickedMarker.group);
}

function setPointerCoords(event) {
  const rect = renderer.domElement.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
}

function raycastPins(event) {
  if (!camera || pinEntries.length === 0) return null;
  setPointerCoords(event);
  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObjects(
    pinEntries.map((p) => p.hitMesh),
    false,
  );
  if (hits.length === 0) return null;
  const hitObj = hits[0].object;
  return pinEntries.find((p) => p.hitMesh === hitObj) || null;
}

function onPointerDown(event) {
  downPos.x = event.clientX;
  downPos.y = event.clientY;
}

function onPointerMove(event) {
  if (userInteracting || !renderer) return;
  const hit = raycastPins(event);
  if (hit) {
    hoveredKey.value = hit.destination.key;
    renderer.domElement.style.cursor = 'pointer';
    updateTooltipPosition(hit);
  } else {
    hoveredKey.value = null;
    hoveredTooltip.value = null;
    renderer.domElement.style.cursor = 'grab';
  }
  updateAutoRotate();
}

function onPointerLeave() {
  hoveredKey.value = null;
  hoveredTooltip.value = null;
  if (renderer) renderer.domElement.style.cursor = 'grab';
  updateAutoRotate();
}

function updateTooltipPosition(entry) {
  const el = container.value;
  if (!el || !camera) return;
  const worldPos = entry.group.position.clone().multiplyScalar(1.04).project(camera);
  if (worldPos.z > 1) {
    hoveredTooltip.value = null;
    return;
  }
  const x = ((worldPos.x + 1) / 2) * el.clientWidth;
  const y = ((-worldPos.y + 1) / 2) * el.clientHeight;
  const temp = entry.destination.weather?.current?.temperature ?? null;
  hoveredTooltip.value = {
    x,
    y,
    flag: entry.destination.flag,
    name: localizedName(entry.destination, locale.value),
    temp,
  };
}

function onPointerUp(event) {
  const moved = Math.hypot(event.clientX - downPos.x, event.clientY - downPos.y);
  if (moved > 5) return;

  const pinHit = raycastPins(event);
  if (pinHit) {
    inspectSaved(pinHit.destination);
    return;
  }

  if (!earthMesh || !camera) return;
  setPointerCoords(event);
  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObject(earthMesh, false);
  if (hits.length > 0) {
    const p = hits[0].point;
    const { lat, lon } = vector3ToLatLon(p.x, p.y, p.z);
    pick(lat, lon);
  }
}

function onDoubleClick() {
  autoOrient();
}

function autoOrient() {
  clearPick();
  const focusTarget = () => {
    if (userLocation) return userLocation;
    const active = props.selectedDestinationKey && props.destinations.find((d) => d.key === props.selectedDestinationKey);
    if (active && hasCoordinates(active)) return { lat: active.latitude, lon: active.longitude };
    const first = props.destinations.find(hasCoordinates);
    if (first) return { lat: first.latitude, lon: first.longitude };
    return { lat: 25, lon: 25 };
  };

  const target = focusTarget();
  flyToCoords(target.lat, target.lon, DEFAULT_DIST, true);

  if (!userLocation && typeof navigator !== 'undefined' && navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        userLocation = { lat: pos.coords.latitude, lon: pos.coords.longitude };
        if (!disposed) flyToCoords(userLocation.lat, userLocation.lon, DEFAULT_DIST, true);
      },
      () => {
        // Permission denied or unavailable; stay cleanly on the fallback target.
      },
      { timeout: 4000, maximumAge: 600_000 },
    );
  }
}

function startLoop() {
  const animate = (now) => {
    if (disposed) return;
    rafId = requestAnimationFrame(animate);

    if (cameraFlight && camera && controls) {
      const elapsed = now - cameraFlight.startTime;
      const rawT = Math.min(1, elapsed / cameraFlight.duration);
      const ease = 1 - (1 - rawT) ** 3;
      const dir = cameraFlight.startDir.clone().lerp(cameraFlight.endDir, ease).normalize();
      const dist = cameraFlight.startDist + (cameraFlight.endDist - cameraFlight.startDist) * ease;
      camera.position.copy(dir.multiplyScalar(dist));
      camera.lookAt(0, 0, 0);
      if (rawT >= 1) {
        cameraFlight = null;
        updateAutoRotate();
      }
    }

    updateAutoRotate();
    controls?.update();

    if (starsObj && !prefersReducedMotion) {
      starsObj.rotation.y += 0.00018;
    }

    if (camera && (labelsDirty || camera.position.distanceToSquared(lastCamPos) > 1e-6)) {
      lastCamPos.copy(camera.position);
      labelsDirty = false;
      updateProjectedLabels();
      maybeFetchZoomCities();
    }

    const tSec = now * 0.001;
    for (const entry of pinEntries) {
      const isHovered = entry.destination.key === hoveredKey.value;
      const targetScale = isHovered ? 1.45 : entry.isActive ? 1.24 : 1.0;
      entry.group.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.16);

      if (!prefersReducedMotion) {
        const wave = (tSec * 0.85 + entry.phase) % 1;
        const ringScale = 1 + wave * 1.4;
        entry.pulseRing.scale.set(ringScale, ringScale, ringScale);
        entry.ringMat.opacity = (1 - wave) * (isHovered || entry.isActive ? 0.9 : 0.65);
      }

      if (isHovered) updateTooltipPosition(entry);
    }

    if (pickedMarker && !prefersReducedMotion) {
      const wave = (tSec * 1.1) % 1;
      const ringScale = 1 + wave * 1.7;
      pickedMarker.pulseRing.scale.set(ringScale, ringScale, ringScale);
      pickedMarker.ringMat.opacity = (1 - wave) * 0.9;
    }

    renderer?.render(scene, camera);
  };
  rafId = requestAnimationFrame(animate);
}

onMounted(() => {
  initScene();
});

onBeforeUnmount(() => {
  disposed = true;
  requestId += 1;
  cancelAnimationFrame(rafId);
  clearTimeout(idleResumeTimer);
  resizeObserver?.disconnect();

  if (renderer?.domElement) {
    const canvas = renderer.domElement;
    canvas.removeEventListener('pointerdown', onPointerDown);
    canvas.removeEventListener('pointermove', onPointerMove);
    canvas.removeEventListener('pointerup', onPointerUp);
    canvas.removeEventListener('pointerleave', onPointerLeave);
    canvas.removeEventListener('dblclick', onDoubleClick);
    canvas.remove();
  }

  disposeObject3D(scene);
  controls?.dispose();
  renderer?.dispose();
  renderer = null;
  scene = null;
  camera = null;
  controls = null;
});

watch(() => props.destinations, renderSaved, { deep: true });

watch(
  () => props.selectedDestinationKey,
  (key) => {
    renderSaved();
    if (!key) return;
    const match = props.destinations.find((d) => d.key === key);
    if (match && hasCoordinates(match)) {
      flyToDestination(match, true);
    }
  },
);

watch([theme, locale], ([newTheme, newLocale], [oldTheme, oldLocale]) => {
  if (newTheme !== oldTheme) applyThemeMaterials();
  if (newLocale !== oldLocale) labelsDirty = true;
});

function clearPick() {
  requestId += 1;
  picked.value = null;
  updatePickedPin(null, null);
  updateAutoRotate();
  labelsDirty = true;
}

/** Open the floating Place Info popup for a destination already in the user's list. */
async function inspectSaved(destination) {
  if (!hasCoordinates(destination)) return;
  requestId += 1;
  updatePickedPin(null, null);
  searchError.value = '';
  flyToDestination(destination, true);

  picked.value = {
    status: 'ready',
    savedKey: destination.key,
    lat: destination.latitude,
    lon: destination.longitude,
    name: destination.name,
    country: destination.country,
    countryCode: destination.countryCode,
    flag: destination.flag,
    admin1: destination.admin1 || '',
    localNames: destination.localNames || {},
    weather: destination.weather,
    tourist: destination.tourist?.[locale.value] || destination.tourist?.en || null,
    touristLoading: !destination.tourist?.[locale.value] && !destination.tourist?.en,
  };
  updateAutoRotate();

  if (!destination.weather) refreshDestination(destination.key);
  if (!destination.tourist?.[locale.value]) await loadTourist(destination.key);

  const updated = props.destinations.find((d) => d.key === destination.key);
  if (updated && picked.value?.savedKey === destination.key) {
    picked.value = {
      ...picked.value,
      weather: updated.weather,
      tourist: updated.tourist?.[locale.value] || updated.tourist?.en || picked.value.tourist,
      touristLoading: false,
    };
  }
}

/**
 * Pick a point: drop a pulsing marker, rotate smoothly there, then look up name, weather and guide.
 *
 * @param {number} lat
 * @param {number} lon
 * @param {{ name?: string, localName?: string }} [hint]
 */
async function pick(lat, lon, hint = {}) {
  const id = ++requestId;
  const longitude = wrapLongitude(lon);
  searchError.value = '';

  picked.value = { status: 'loading', savedKey: null, lat, lon: longitude, weather: null, tourist: null, touristLoading: false };
  labelsDirty = true;
  updatePickedPin(lat, longitude);
  flyToCoords(lat, longitude, FOCUS_DIST, true);
  updateAutoRotate();

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
  const candidateKey = makeDestinationKey({ name: base.name, countryCode: base.countryCode });
  const existing = props.destinations.find((d) => d.key === candidateKey);

  picked.value = {
    ...picked.value,
    ...base,
    savedKey: existing ? existing.key : null,
    status: 'ready',
    localNames: existing?.localNames || {},
    touristLoading: true,
  };

  const [weather, tourist] = await Promise.all([
    weatherPromise,
    fetchTouristInfo({ name: base.name, country: base.country, admin1: base.admin1 }, { locale: locale.value }).catch(() => null),
  ]);
  if (id !== requestId) return;

  const localNames = { ...(existing?.localNames || {}) };
  if (locale.value === 'ar' && !localNames.ar) {
    const fromWiki = hint.localName || (tourist?.lang === 'ar' ? tourist.title.replace(/\s*\(.*\)\s*$/, '') : null);
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
    const place = await detectPlace(text);
    if (place) {
      await pick(place.latitude, place.longitude, { name: place.name });
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

/** Focus the 3D Earth on a place passed from the left input bar. */
function focusLocation(place) {
  if (!place) return;
  const existing = props.destinations.find(
    (d) => d.name.toLowerCase() === place.name.toLowerCase() && (!place.countryCode || d.countryCode === place.countryCode),
  );
  if (existing) {
    inspectSaved(existing);
    emit('sync-destination', existing.key);
    return;
  }
  if (Number.isFinite(place.lat) && Number.isFinite(place.lon)) {
    pick(place.lat, place.lon, { name: place.name });
  } else if (Number.isFinite(place.latitude) && Number.isFinite(place.longitude)) {
    pick(place.latitude, place.longitude, { name: place.name });
  }
}

function syncToList() {
  const p = picked.value;
  if (!p || p.status !== 'ready') return;

  if (p.savedKey) {
    const display = pickedName.value;
    emit('sync-destination', p.savedKey);
    toast.success(t('map.synced', { name: display }));
    clearPick();
    return;
  }

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
  emit('sync-destination', place.key);
  toast.success(t('map.added', { name: display }));
  clearPick();
}

defineExpose({ focusLocation });
</script>

<style>
.globe-stage {
  background: transparent;
}
.globe-stage canvas {
  outline: none;
  cursor: grab;
  touch-action: none;
}
.globe-stage canvas:active {
  cursor: grabbing;
}
.earth-label {
  text-shadow: 0 1px 4px rgb(4 9 22 / 0.9);
  transition:
    color 140ms ease,
    background-color 140ms ease;
}
[data-theme='light'] .earth-label {
  text-shadow: 0 1px 3px rgb(255 255 255 / 0.95);
}
@media (hover: hover) and (pointer: fine) {
  .earth-label:hover {
    background-color: oklch(var(--b1) / 0.9);
    color: oklch(var(--p));
  }
}
</style>
