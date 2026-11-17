import { getForecastForDate, SNOW_CONDITIONS, WET_CONDITIONS } from '../services/travelApi.js';

export const COLD_THRESHOLD_C = 12;
export const HOT_THRESHOLD_C = 28;
export const WINDY_THRESHOLD_KMH = 40;
export const RAIN_PROBABILITY_THRESHOLD = 50;

/**
 * @typedef {Object} PackingSuggestion
 * @property {string} id              Stable id used for dismissal, e.g. "Cairo|EG:hot"
 * @property {string} destinationKey
 * @property {string} name
 * @property {string} flag
 * @property {'rain' | 'snow' | 'cold' | 'hot' | 'wind'} type
 * @property {string} icon
 * @property {number | null} temp
 * @property {string} conditionKey
 * @property {string | null} date     Trip date the advice is based on, or null for current weather
 */

const ICONS = { rain: '☔', snow: '🧤', cold: '🧥', hot: '🧴', wind: '🧣' };

/**
 * Earliest upcoming due date per destination, so advice targets the trip day.
 *
 * @param {import('../store/storage.js').Task[]} tasks
 * @param {string} today  YYYY-MM-DD
 * @returns {Map<string, string | null>}
 */
export function earliestTripDates(tasks, today) {
  const map = new Map();
  for (const task of tasks) {
    if (!task.destinationKey) continue;
    const current = map.has(task.destinationKey) ? map.get(task.destinationKey) : null;
    const candidate = task.dueDate && task.dueDate >= today ? task.dueDate : null;
    if (!map.has(task.destinationKey)) map.set(task.destinationKey, candidate);
    else if (candidate && (!current || candidate < current)) map.set(task.destinationKey, candidate);
  }
  return map;
}

/**
 * Derive packing advice from each destination's weather. When a trip date is
 * within the forecast horizon the forecast for that day is used; otherwise the
 * current conditions are.
 *
 * @param {import('../store/storage.js').Task[]} tasks
 * @param {Record<string, import('../store/storage.js').Destination>} destinations
 * @param {{ dismissed?: string[], today: string }} options
 * @returns {PackingSuggestion[]}
 */
export function computePackingSuggestions(tasks, destinations, options) {
  const dismissed = new Set(options.dismissed || []);
  const tripDates = earliestTripDates(tasks, options.today);
  const suggestions = [];

  for (const [key, tripDate] of tripDates) {
    const destination = destinations[key];
    if (!destination?.weather) continue;

    const forecast = getForecastForDate(destination.weather, tripDate);
    const conditionKey = forecast ? forecast.conditionKey : destination.weather.current.conditionKey;
    const temp = forecast ? forecast.max : destination.weather.current.temperature;
    const low = forecast ? forecast.min : destination.weather.current.temperature;
    const wind = forecast ? forecast.windMax : destination.weather.current.windSpeed;
    const precip = forecast ? forecast.precipProb : null;
    const date = forecast ? tripDate : null;

    const push = (type) => {
      const id = `${key}:${type}`;
      if (dismissed.has(id)) return;
      suggestions.push({
        id,
        destinationKey: key,
        name: destination.name,
        flag: destination.flag,
        type,
        icon: ICONS[type],
        temp,
        conditionKey,
        date,
      });
    };

    if (SNOW_CONDITIONS.has(conditionKey)) push('snow');
    else if (WET_CONDITIONS.has(conditionKey) || (precip !== null && precip >= RAIN_PROBABILITY_THRESHOLD)) push('rain');

    if (low !== null && low < COLD_THRESHOLD_C && !SNOW_CONDITIONS.has(conditionKey)) push('cold');
    else if (temp !== null && temp > HOT_THRESHOLD_C) push('hot');

    if (wind !== null && wind >= WINDY_THRESHOLD_KMH) push('wind');
  }

  return suggestions;
}
