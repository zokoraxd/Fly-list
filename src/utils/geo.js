/**
 * Small geography helpers used by the globe. Pure functions, no dependencies.
 */

const EARTH_RADIUS_KM = 6371;

/** Wrap a longitude into the range -180..180. */
export function wrapLongitude(lng) {
  return ((((lng + 180) % 360) + 360) % 360) - 180;
}

/**
 * Format a coordinate pair in degrees, e.g. "33.32°N, 44.37°E".
 * Always Latin digits so it reads the same in English and Arabic.
 *
 * @param {number} lat
 * @param {number} lon
 * @param {number} [digits]
 * @returns {string}
 */
export function formatCoordinates(lat, lon, digits = 2) {
  const wrapped = wrapLongitude(lon);
  const ns = lat >= 0 ? 'N' : 'S';
  const ew = wrapped >= 0 ? 'E' : 'W';
  return `${Math.abs(lat).toFixed(digits)}°${ns}, ${Math.abs(wrapped).toFixed(digits)}°${ew}`;
}

/**
 * Distance between two points in kilometres (haversine).
 *
 * @param {[number, number]} a  [lat, lon]
 * @param {[number, number]} b  [lat, lon]
 * @returns {number}
 */
export function distanceKm(a, b) {
  const rad = Math.PI / 180;
  const dLat = (b[0] - a[0]) * rad;
  const dLon = (b[1] - a[1]) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a[0] * rad) * Math.cos(b[0] * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * Points along the great circle between two coordinates, as [lng, lat] pairs.
 * On a globe a straight line in lng/lat looks wrong; this follows the shortest path.
 * Longitudes are unwrapped so a path crossing the antimeridian stays continuous.
 *
 * @param {[number, number]} from  [lat, lon]
 * @param {[number, number]} to    [lat, lon]
 * @param {number} [steps]
 * @returns {[number, number][]}
 */
export function greatCircle(from, to, steps = 32) {
  const rad = Math.PI / 180;
  const lat1 = from[0] * rad;
  const lon1 = from[1] * rad;
  const lat2 = to[0] * rad;
  const lon2 = to[1] * rad;
  const d = 2 * Math.asin(Math.sqrt(Math.sin((lat2 - lat1) / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin((lon2 - lon1) / 2) ** 2));

  if (d < 1e-9) return [[from[1], from[0]]];

  const points = [];
  let previousLng = from[1];
  for (let i = 0; i <= steps; i++) {
    const f = i / steps;
    const a = Math.sin((1 - f) * d) / Math.sin(d);
    const b = Math.sin(f * d) / Math.sin(d);
    const x = a * Math.cos(lat1) * Math.cos(lon1) + b * Math.cos(lat2) * Math.cos(lon2);
    const y = a * Math.cos(lat1) * Math.sin(lon1) + b * Math.cos(lat2) * Math.sin(lon2);
    const z = a * Math.sin(lat1) + b * Math.sin(lat2);
    const lat = Math.atan2(z, Math.sqrt(x * x + y * y)) / rad;
    let lng = Math.atan2(y, x) / rad;
    // Keep the path continuous across the antimeridian.
    while (lng - previousLng > 180) lng -= 360;
    while (lng - previousLng < -180) lng += 360;
    previousLng = lng;
    points.push([lng, lat]);
  }
  return points;
}
