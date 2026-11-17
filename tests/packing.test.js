import { describe, expect, it } from 'vitest';
import { computePackingSuggestions, earliestTripDates } from '../src/utils/packing.js';

const TODAY = '2026-10-31';

function destination(key, name, current, daily = []) {
  return { key, name, flag: '🏳️', weather: { fetchedAt: new Date().toISOString(), current, daily } };
}

const base = { humidity: 50, windSpeed: 10, icon: '☀️' };

describe('earliestTripDates', () => {
  it('picks the soonest upcoming date per destination and ignores past dates', () => {
    const tasks = [
      { destinationKey: 'A', dueDate: '2026-12-01' },
      { destinationKey: 'A', dueDate: '2026-11-10' },
      { destinationKey: 'A', dueDate: '2026-01-01' },
      { destinationKey: 'B', dueDate: null },
      { destinationKey: null, dueDate: '2026-11-01' },
    ];
    const map = earliestTripDates(tasks, TODAY);
    expect(map.get('A')).toBe('2026-11-10');
    expect(map.get('B')).toBeNull();
    expect(map.has(null)).toBe(false);
  });
});

describe('computePackingSuggestions', () => {
  it('suggests sunscreen for hot current weather', () => {
    const destinations = { 'Cairo|EG': destination('Cairo|EG', 'Cairo', { ...base, temperature: 34, conditionKey: 'clear' }) };
    const tasks = [{ destinationKey: 'Cairo|EG', dueDate: null }];
    const result = computePackingSuggestions(tasks, destinations, { today: TODAY });
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ id: 'Cairo|EG:hot', type: 'hot', temp: 34, date: null, name: 'Cairo' });
  });

  it('uses the trip-day forecast when it is within range', () => {
    const daily = [{ date: '2026-11-05', max: 8, min: 2, conditionKey: 'rain', precipProb: 80, windMax: 20, icon: '🌧️' }];
    const destinations = { 'Oslo|NO': destination('Oslo|NO', 'Oslo', { ...base, temperature: 30, conditionKey: 'clear' }, daily) };
    const tasks = [{ destinationKey: 'Oslo|NO', dueDate: '2026-11-05' }];
    const result = computePackingSuggestions(tasks, destinations, { today: TODAY });
    expect(result.map((s) => s.type)).toEqual(['rain', 'cold']);
    expect(result[0].date).toBe('2026-11-05');
  });

  it('suggests rain gear from precipitation probability alone', () => {
    const daily = [{ date: '2026-11-05', max: 20, min: 15, conditionKey: 'partlyCloudy', precipProb: 65, windMax: 10, icon: '⛅' }];
    const destinations = { 'X|X': destination('X|X', 'X', { ...base, temperature: 20, conditionKey: 'clear' }, daily) };
    const result = computePackingSuggestions([{ destinationKey: 'X|X', dueDate: '2026-11-05' }], destinations, { today: TODAY });
    expect(result.map((s) => s.type)).toEqual(['rain']);
  });

  it('prefers snow over rain and cold, and flags strong wind', () => {
    const destinations = { 'X|X': destination('X|X', 'X', { ...base, temperature: -2, windSpeed: 55, conditionKey: 'snow' }) };
    const result = computePackingSuggestions([{ destinationKey: 'X|X', dueDate: null }], destinations, { today: TODAY });
    expect(result.map((s) => s.type)).toEqual(['snow', 'wind']);
  });

  it('respects dismissed suggestions and missing weather', () => {
    const destinations = {
      'Cairo|EG': destination('Cairo|EG', 'Cairo', { ...base, temperature: 34, conditionKey: 'clear' }),
      'Nowhere|XX': { key: 'Nowhere|XX', name: 'Nowhere', weather: null },
    };
    const tasks = [
      { destinationKey: 'Cairo|EG', dueDate: null },
      { destinationKey: 'Nowhere|XX', dueDate: null },
    ];
    expect(computePackingSuggestions(tasks, destinations, { today: TODAY, dismissed: ['Cairo|EG:hot'] })).toEqual([]);
  });

  it('says nothing for mild weather', () => {
    const destinations = { 'X|X': destination('X|X', 'X', { ...base, temperature: 21, conditionKey: 'partlyCloudy' }) };
    expect(computePackingSuggestions([{ destinationKey: 'X|X', dueDate: null }], destinations, { today: TODAY })).toEqual([]);
  });
});
