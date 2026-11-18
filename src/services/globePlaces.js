import { VectorTile } from '@mapbox/vector-tile';
import { PbfReader } from 'pbf';
import { PLACE_ALIASES } from '../data/placeAliases.js';
import { PLACES } from '../data/places.js';
import { wrapLongitude } from '../utils/geo.js';
import { getCountryFlag } from '../utils/flags.js';
import { localizedCountry } from '../utils/placeName.js';

const OPENFREEMAP_TILEJSON = 'https://tiles.openfreemap.org/planet';

let tileTemplatePromise = null;
let baseCountriesPromise = null;
const fetchedCityTiles = new Map();

/** Build reverse Arabic lookup from placeAliases so local places have Arabic names offline. */
function buildArabicAliasMap() {
  const map = new Map();
  const arabicRe = /[؀-ۿ]/;
  for (const [alias, canonical] of Object.entries(PLACE_ALIASES)) {
    if (!arabicRe.test(alias)) continue;
    if (!map.has(canonical)) map.set(canonical, alias);
  }
  return map;
}

const ARABIC_BY_EN = buildArabicAliasMap();

/** Localized Arabic fallbacks for cities/regions missing from OpenFreeMap tiles or aliases. */
const EXTRA_ARABIC_NAMES = {
  Scotland: 'اسكتلندا',
  'Kuwait City': 'مدينة الكويت',
  Tunis: 'تونس',
  Algiers: 'الجزائر',
  Rotterdam: 'روتردام',
  Salzburg: 'سالزبورغ',
  Krakow: 'كراكوف',
  Mykonos: 'ميكونوس',
  Reykjavik: 'ريكيافيك',
  'Saint Petersburg': 'سانت بطرسبرغ',
  Busan: 'بوسان',
  Taipei: 'تايبيه',
  'Chiang Mai': 'شيانغ ماي',
  Hanoi: 'هانوي',
  'Ho Chi Minh City': 'مدينة هو تشي منه',
  Auckland: 'أوكلاند',
  Orlando: 'أورلاندو',
  Seattle: 'سياتل',
  'Mexico City': 'مدينة مكسيكو',
  Cancun: 'كانكون',
  Cancún: 'كانكون',
  'Sao Paulo': 'ساو باولو',
  'São Paulo': 'ساو باولو',
  Santiago: 'سانتياغو',
  Lima: 'ليما',
  Cusco: 'كوسكو',
  Bogota: 'بوغوتا',
  Bogotá: 'بوغوتا',
  California: 'كاليفورنيا',
  Florida: 'فلوريدا',
  Texas: 'تكساس',
  Hawaii: 'هاواي',
  Alaska: 'ألاسكا',
  Ontario: 'أونتاريو',
  Quebec: 'كيبك',
  Bavaria: 'بافاريا',
  Catalonia: 'كتالونيا',
  Tuscany: 'توسكانا',
  Sicily: 'صقلية',
};

/** Baseline labels built synchronously from the local gazetteer so the Earth is populated immediately. */
export function getLocalGlobeLabels() {
  const seen = new Set();
  const labels = [];

  for (const p of PLACES) {
    const isCountry = p.name === p.country;
    const key = `${isCountry ? 'country' : 'city'}:${p.name.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const arCountry = p.countryCode ? localizedCountry(p.countryCode, 'ar', '') : '';
    const nameAr = isCountry
      ? arCountry || EXTRA_ARABIC_NAMES[p.name] || ARABIC_BY_EN.get(p.name) || p.name
      : EXTRA_ARABIC_NAMES[p.name] || ARABIC_BY_EN.get(p.name) || p.name;

    labels.push({
      id: key,
      kind: isCountry ? 'country' : 'city',
      rank: isCountry ? 1 : 3,
      nameEn: p.name,
      nameAr,
      lat: p.lat,
      lon: p.lon,
      countryCode: p.countryCode || '',
      flag: p.flag || getCountryFlag(p.countryCode) || '🌐',
    });
  }
  return labels;
}

async function getTileTemplate() {
  if (!tileTemplatePromise) {
    tileTemplatePromise = fetch(OPENFREEMAP_TILEJSON)
      .then((res) => {
        if (!res.ok) throw new Error(`TileJSON ${res.status}`);
        return res.json();
      })
      .then((data) => data?.tiles?.[0] || null)
      .catch(() => null);
  }
  return tileTemplatePromise;
}

function pickPrimaryCoord(geometry) {
  if (!geometry) return null;
  if (geometry.type === 'Point') return geometry.coordinates;
  if (geometry.type === 'MultiPoint' && geometry.coordinates.length > 0) {
    const inRange = geometry.coordinates.find(([lon]) => lon >= -180 && lon <= 180);
    return inRange || geometry.coordinates[0];
  }
  return null;
}

function decodePlaceTile(buffer, z, x, y, allowedClasses) {
  const tile = new VectorTile(new PbfReader(buffer));
  const layer = tile.layers.place;
  if (!layer) return [];

  const items = [];
  for (let i = 0; i < layer.length; i++) {
    const feature = layer.feature(i).toGeoJSON(x, y, z);
    const props = feature.properties || {};
    const cls = props.class;
    if (!allowedClasses.has(cls)) continue;

    const coords = pickPrimaryCoord(feature.geometry);
    if (!coords) continue;

    const lon = wrapLongitude(coords[0]);
    const lat = coords[1];
    if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 84) continue;

    const nameEn = String(props['name:en'] || props.name_en || props.name || '').trim();
    if (!nameEn) continue;
    const iso = String(props.iso_a2 || '').toUpperCase();
    const arFallback = iso ? localizedCountry(iso, 'ar', '') : '';
    const nameAr = String(props['name:ar'] || props.name_ar || arFallback || EXTRA_ARABIC_NAMES[nameEn] || ARABIC_BY_EN.get(nameEn) || nameEn).trim();

    items.push({
      id: `ofm:${cls}:${nameEn.toLowerCase()}`,
      kind: cls === 'country' ? 'country' : 'city',
      rank: Number(props.rank) || 5,
      nameEn,
      nameAr,
      lat,
      lon,
      countryCode: iso,
      flag: iso ? getCountryFlag(iso) : '🌐',
    });
  }
  return items;
}

/**
 * Fetch country labels from OpenFreeMap z=1 vector tiles (reusing the old Earth's API).
 * Returns deduplicated labels across all 4 global tiles, or [] on network failure.
 */
export async function fetchOpenFreeMapCountries() {
  if (baseCountriesPromise) return baseCountriesPromise;

  baseCountriesPromise = (async () => {
    const tpl = await getTileTemplate();
    if (!tpl) return [];

    const coords = [
      [0, 0],
      [1, 0],
      [0, 1],
      [1, 1],
    ];
    const allowed = new Set(['country']);
    const results = await Promise.all(
      coords.map(async ([x, y]) => {
        try {
          const url = tpl.replace('{z}', 1).replace('{x}', x).replace('{y}', y);
          const res = await fetch(url);
          if (!res.ok) return [];
          return decodePlaceTile(await res.arrayBuffer(), 1, x, y, allowed);
        } catch {
          return [];
        }
      }),
    );

    const byKey = new Map();
    for (const item of results.flat()) {
      const key = item.nameEn.toLowerCase();
      if (!byKey.has(key)) byKey.set(key, item);
    }
    return [...byKey.values()];
  })();

  return baseCountriesPromise;
}

/** Convert (lat, lon) to slippy tile (x, y) at zoom z. */
export function latLonToTileXY(lat, lon, z) {
  const n = 2 ** z;
  const x = Math.max(0, Math.min(n - 1, Math.floor(((wrapLongitude(lon) + 180) / 360) * n)));
  const latRad = (Math.max(-85, Math.min(85, lat)) * Math.PI) / 180;
  const y = Math.max(0, Math.min(n - 1, Math.floor(((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n)));
  return { x, y };
}

/**
 * Fetch city labels from the OpenFreeMap z=2 tile covering (lat, lon) when zoomed in.
 * Cached per tile coordinate so spinning around never re-fetches tiles.
 */
export async function fetchOpenFreeMapCitiesNear(lat, lon) {
  const z = 2;
  const { x, y } = latLonToTileXY(lat, lon, z);
  const key = `${z}/${x}/${y}`;
  if (fetchedCityTiles.has(key)) return fetchedCityTiles.get(key);

  const promise = (async () => {
    const tpl = await getTileTemplate();
    if (!tpl) return [];
    try {
      const url = tpl.replace('{z}', z).replace('{x}', x).replace('{y}', y);
      const res = await fetch(url);
      if (!res.ok) return [];
      return decodePlaceTile(await res.arrayBuffer(), z, x, y, new Set(['city']));
    } catch {
      return [];
    }
  })();

  fetchedCityTiles.set(key, promise);
  return promise;
}
