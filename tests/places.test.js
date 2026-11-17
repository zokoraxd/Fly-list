import { describe, expect, it } from 'vitest';
import { AMBIGUOUS_NAMES, extractPlaceFromText, getPlaceByName, normalizeToken, PLACES } from '../src/data/places.js';
import { PLACE_ALIASES } from '../src/data/placeAliases.js';

describe('PLACES data integrity', () => {
  it('has unique canonical names', () => {
    const names = PLACES.map((p) => p.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it('has valid coordinates and country codes', () => {
    for (const place of PLACES) {
      expect(place.lat, place.name).toBeGreaterThanOrEqual(-90);
      expect(place.lat, place.name).toBeLessThanOrEqual(90);
      expect(place.lon, place.name).toBeGreaterThanOrEqual(-180);
      expect(place.lon, place.name).toBeLessThanOrEqual(180);
      expect(place.countryCode, place.name).toMatch(/^[A-Z]{2}$/);
      expect(place.flag, place.name).toBeTruthy();
    }
  });

  it('every alias points at an existing place', () => {
    for (const [alias, canonical] of Object.entries(PLACE_ALIASES)) {
      expect(getPlaceByName(canonical), `${alias} → ${canonical}`).toBeDefined();
    }
  });
});

describe('extractPlaceFromText', () => {
  it('matches single-word cities and countries', () => {
    expect(extractPlaceFromText('Flight to Tokyo next Friday')?.name).toBe('Tokyo');
    expect(extractPlaceFromText('book hotel in cairo')?.name).toBe('Cairo');
    expect(extractPlaceFromText('Trip to Egypt')?.name).toBe('Egypt');
  });

  it('prefers the longest phrase', () => {
    expect(extractPlaceFromText('Hotel in New York City')?.matchedText).toBe('New York City');
    expect(extractPlaceFromText('Visit Sharm El-Sheikh')?.name).toBe('Sharm El Sheikh');
    expect(extractPlaceFromText('Fly to the United Arab Emirates')?.name).toBe('United Arab Emirates');
  });

  it('prefers the destination over the origin', () => {
    expect(extractPlaceFromText('Flight from Cairo to Paris')?.name).toBe('Paris');
    expect(extractPlaceFromText('Train from Rome to Florence')?.name).toBe('Florence');
    expect(extractPlaceFromText('Leaving Dubai, hotel in London')?.name).toBe('London');
  });

  it('resolves aliases and abbreviations', () => {
    expect(extractPlaceFromText('NYC weekend')?.name).toBe('New York');
    expect(extractPlaceFromText('Fly to KSA')?.name).toBe('Saudi Arabia');
    expect(extractPlaceFromText('vacation in the UAE')?.name).toBe('United Arab Emirates');
    expect(extractPlaceFromText('Washington DC trip')?.name).toBe('Washington');
    expect(extractPlaceFromText('Explore Marrakesh')?.name).toBe('Marrakech');
  });

  it('ignores ambiguous words used in their ordinary sense', () => {
    expect(extractPlaceFromText('Have a nice flight')).toBeNull();
    expect(extractPlaceFromText('buy a turkey for dinner')).toBeNull();
    expect(extractPlaceFromText('Call Jordan about the meeting')).toBeNull();
    expect(extractPlaceFromText('Meet Florence for coffee')).toBeNull();
    expect(extractPlaceFromText('order some china plates')).toBeNull();
  });

  it('accepts ambiguous words when capitalised or introduced by a cue', () => {
    expect(extractPlaceFromText('Flight to Nice')?.name).toBe('Nice');
    expect(extractPlaceFromText('flight to turkey')?.name).toBe('Turkey');
    expect(extractPlaceFromText('Trip to Jordan')?.name).toBe('Jordan');
    expect(extractPlaceFromText('Jordan trip in May')?.name).toBe('Jordan');
    expect(extractPlaceFromText('weekend in Florence')?.name).toBe('Florence');
  });

  it('returns null for ordinary tasks', () => {
    expect(extractPlaceFromText('Renew passport')).toBeNull();
    expect(extractPlaceFromText('Pack passport, power adapter and headphones')).toBeNull();
    expect(extractPlaceFromText('')).toBeNull();
    expect(extractPlaceFromText(null)).toBeNull();
  });

  it('understands Arabic names, prefixes and spelling variants', () => {
    expect(extractPlaceFromText('رحلة إلى القاهرة')?.name).toBe('Cairo');
    expect(extractPlaceFromText('حجز فندق في اسطنبول')?.name).toBe('Istanbul');
    expect(extractPlaceFromText('السفر للرياض الأسبوع القادم')?.name).toBe('Riyadh');
    expect(extractPlaceFromText('زيارة شرم الشيخ')?.name).toBe('Sharm El Sheikh');
    expect(extractPlaceFromText('تذاكر لدبي')?.name).toBe('Dubai');
    expect(extractPlaceFromText('رحلة من القاهرة إلى باريس')?.name).toBe('Paris');
  });

  it('does not mutate the shared place record', () => {
    const result = extractPlaceFromText('Flight to Tokyo');
    result.name = 'Changed';
    expect(getPlaceByName('Tokyo').name).toBe('Tokyo');
  });
});

describe('normalizeToken', () => {
  it('unifies Arabic letter variants and strips diacritics', () => {
    expect(normalizeToken('إسطنبول')).toBe(normalizeToken('اسطنبول'));
    expect(normalizeToken('جدة')).toBe(normalizeToken('جده'));
    expect(normalizeToken('مَكّة')).toBe(normalizeToken('مكه'));
  });

  it('lower-cases Latin text', () => {
    expect(normalizeToken('PARIS')).toBe('paris');
  });

  it('keeps the ambiguous set lower-cased', () => {
    for (const word of AMBIGUOUS_NAMES) expect(word).toBe(word.toLowerCase());
  });
});
