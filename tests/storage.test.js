import { describe, expect, it } from 'vitest';
import {
  createEmptyState,
  LEGACY_STORAGE_KEY,
  loadState,
  migrateLegacyTasks,
  normalizeDestination,
  normalizeState,
  normalizeTask,
  pruneOrphanDestinations,
  saveState,
  STORAGE_KEY,
} from '../src/store/storage.js';

class MemoryStorage {
  constructor(entries = {}) {
    this.map = new Map(Object.entries(entries));
  }
  getItem(key) {
    return this.map.has(key) ? this.map.get(key) : null;
  }
  setItem(key, value) {
    this.map.set(key, String(value));
  }
  removeItem(key) {
    this.map.delete(key);
  }
}

const LEGACY = [
  {
    id: 'fly_1',
    title: 'Flight to Paris',
    status: 'in-progress',
    destinationName: 'Paris',
    destinationData: {
      name: 'Paris',
      country: 'France',
      countryCode: 'FR',
      flag: '🇫🇷',
      lat: 48.8566,
      lon: 2.3522,
      latitude: 48.8566,
      longitude: 2.3522,
      timezone: 'France',
      weather: { temperature: 12, condition: 'Rain', icon: '🌧️', forecast: [] },
      tourist: { title: 'Paris', description: 'Capital of France', extract: 'Paris is…', thumbnail: null, pageUrl: 'https://en.wikipedia.org/wiki/Paris' },
    },
    isEditing: true,
    editTitle: 'Flight to Paris',
  },
  {
    id: 'fly_2',
    title: 'Hotel in Paris',
    status: 'planned',
    destinationName: 'Paris',
    destinationData: { name: 'Paris', country: 'France', countryCode: 'FR', flag: '🇫🇷', lat: 48.8566, lon: 2.3522 },
  },
  { id: 'fly_3', title: 'Pack passport', status: 'completed', destinationName: null, destinationData: null },
];

describe('normalizeTask', () => {
  it('fills defaults and drops UI state', () => {
    const task = normalizeTask({ id: 'a', title: '  Hello ', status: 'bogus', isEditing: true, editTitle: 'x' });
    expect(task).toMatchObject({ id: 'a', title: 'Hello', status: 'planned', dueDate: null, dueDateSource: null, destinationKey: null, detection: 'none' });
    expect(task).not.toHaveProperty('isEditing');
    expect(task.createdAt).toBeTruthy();
  });

  it('rejects records without id or title', () => {
    expect(normalizeTask({ id: 'a' })).toBeNull();
    expect(normalizeTask({ title: 'x' })).toBeNull();
    expect(normalizeTask('nope')).toBeNull();
  });

  it('validates due dates', () => {
    expect(normalizeTask({ id: 'a', title: 't', dueDate: '2026-11-01' }).dueDate).toBe('2026-11-01');
    expect(normalizeTask({ id: 'a', title: 't', dueDate: 'tomorrow' }).dueDate).toBeNull();
    expect(normalizeTask({ id: 'a', title: 't', dueDate: '2026-11-01', dueDateSource: 'manual' }).dueDateSource).toBe('manual');
  });
});

describe('normalizeDestination', () => {
  it('accepts lat/lon or latitude/longitude', () => {
    expect(normalizeDestination({ name: 'Rome', countryCode: 'it', lat: 41.9, lon: 12.5 })).toMatchObject({
      key: 'Rome|IT',
      latitude: 41.9,
      longitude: 12.5,
      tourist: {},
      climate: {},
    });
    expect(normalizeDestination({ name: 'Rome', latitude: 41.9, longitude: 12.5 })?.key).toBe('Rome|');
  });

  it('rejects incomplete records and legacy weather shapes', () => {
    expect(normalizeDestination({ name: 'Rome' })).toBeNull();
    expect(normalizeDestination({ name: 'Rome', lat: 1, lon: 2, weather: { temperature: 10 } }).weather).toBeNull();
  });

  it('wraps a legacy single-language tourist object', () => {
    const d = normalizeDestination({ name: 'Rome', lat: 1, lon: 2, tourist: { extract: 'Rome is…' } });
    expect(d.tourist.en.extract).toBe('Rome is…');
    expect(d.tourist.en.lang).toBe('en');
  });
});

describe('migrateLegacyTasks', () => {
  it('deduplicates destinations and links tasks to them', () => {
    const state = migrateLegacyTasks(LEGACY);
    expect(state.seeded).toBe(true);
    expect(state.tasks).toHaveLength(3);
    expect(Object.keys(state.destinations)).toEqual(['Paris|FR']);
    expect(state.tasks[0]).toMatchObject({ id: 'fly_1', destinationKey: 'Paris|FR', detection: 'done', status: 'in-progress' });
    expect(state.tasks[2]).toMatchObject({ id: 'fly_3', destinationKey: null, detection: 'none' });
  });

  it('discards legacy weather so it is fetched fresh, but keeps the guide', () => {
    const state = migrateLegacyTasks(LEGACY);
    const paris = state.destinations['Paris|FR'];
    expect(paris.weather).toBeNull();
    expect(paris.timezone).toBeNull();
    expect(paris.tourist.en.extract).toBe('Paris is…');
  });

  it('tolerates garbage', () => {
    expect(migrateLegacyTasks('nope').tasks).toEqual([]);
    expect(migrateLegacyTasks([null, 1, {}]).tasks).toEqual([]);
  });
});

describe('normalizeState', () => {
  it('drops duplicate ids and dangling destination references', () => {
    const state = normalizeState({
      tasks: [
        { id: 'a', title: 'A', destinationKey: 'Gone|XX' },
        { id: 'a', title: 'A again' },
        { id: 'b', title: 'B', destinationKey: 'Rome|IT' },
      ],
      destinations: { 'Rome|IT': { key: 'Rome|IT', name: 'Rome', countryCode: 'IT', lat: 1, lon: 2 } },
      dismissedSuggestions: ['Rome|IT:hot', 42],
    });
    expect(state.tasks.map((t) => t.id)).toEqual(['a', 'b']);
    expect(state.tasks[0]).toMatchObject({ destinationKey: null, detection: 'none' });
    expect(state.tasks[1].destinationKey).toBe('Rome|IT');
    expect(state.dismissedSuggestions).toEqual(['Rome|IT:hot']);
  });

  it('throws on unrecognisable input', () => {
    expect(() => normalizeState(null)).toThrow();
    expect(() => normalizeState({ foo: 1 })).toThrow();
    expect(() => normalizeState([])).toThrow();
  });
});

describe('loadState / saveState', () => {
  it('returns an empty state when nothing is stored', () => {
    expect(loadState(new MemoryStorage())).toEqual(createEmptyState());
  });

  it('migrates legacy data once and removes the old key', () => {
    const storage = new MemoryStorage({ [LEGACY_STORAGE_KEY]: JSON.stringify(LEGACY) });
    const state = loadState(storage);
    expect(state.tasks).toHaveLength(3);
    expect(storage.getItem(LEGACY_STORAGE_KEY)).toBeNull();
  });

  it('prefers current state over legacy and survives corrupt JSON', () => {
    const storage = new MemoryStorage({ [STORAGE_KEY]: '{not json', [LEGACY_STORAGE_KEY]: JSON.stringify(LEGACY) });
    expect(loadState(storage).tasks).toHaveLength(3);

    const good = createEmptyState();
    good.tasks.push(normalizeTask({ id: 'z', title: 'Z' }));
    const storage2 = new MemoryStorage();
    expect(saveState(good, storage2)).toBe(true);
    expect(loadState(storage2).tasks[0].id).toBe('z');
  });

  it('does not reseed when the user has deleted everything', () => {
    const state = createEmptyState();
    state.seeded = true;
    const storage = new MemoryStorage();
    saveState(state, storage);
    expect(loadState(storage).seeded).toBe(true);
  });

  it('reports failure when storage is unavailable or full', () => {
    expect(saveState(createEmptyState(), null)).toBe(false);
    const full = {
      setItem: () => {
        throw new Error('QuotaExceeded');
      },
    };
    expect(saveState(createEmptyState(), full)).toBe(false);
  });
});

describe('pruneOrphanDestinations', () => {
  it('removes destinations no task references', () => {
    const state = normalizeState({
      tasks: [{ id: 'a', title: 'A', destinationKey: 'Rome|IT' }],
      destinations: {
        'Rome|IT': { name: 'Rome', countryCode: 'IT', lat: 1, lon: 2 },
        'Oslo|NO': { name: 'Oslo', countryCode: 'NO', lat: 1, lon: 2 },
      },
    });
    pruneOrphanDestinations(state);
    expect(Object.keys(state.destinations)).toEqual(['Rome|IT']);
  });
});
