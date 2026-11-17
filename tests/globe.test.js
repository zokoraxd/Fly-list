import { describe, expect, it } from 'vitest';
import { distanceKm, formatCoordinates, greatCircle, wrapLongitude } from '../src/utils/geo.js';
import { localizedCountry, localizedName } from '../src/utils/placeName.js';
import { parseReverseGeocode } from '../src/services/travelApi.js';
import { normalizeDestination } from '../src/store/storage.js';

describe('geo helpers', () => {
  it('wraps longitudes into -180..180', () => {
    expect(wrapLongitude(190)).toBe(-170);
    expect(wrapLongitude(-190)).toBe(170);
    expect(wrapLongitude(0)).toBe(0);
    expect(wrapLongitude(540)).toBe(-180);
  });

  it('formats coordinates in degrees with hemispheres', () => {
    expect(formatCoordinates(33.3152, 44.3661)).toBe('33.32°N, 44.37°E');
    expect(formatCoordinates(-12.5, -77.04)).toBe('12.50°S, 77.04°W');
    expect(formatCoordinates(10, 190)).toBe('10.00°N, 170.00°W');
  });

  it('measures distance between two points', () => {
    const paris = [48.8566, 2.3522];
    const london = [51.5074, -0.1278];
    expect(distanceKm(paris, london)).toBeGreaterThan(335);
    expect(distanceKm(paris, london)).toBeLessThan(350);
    expect(distanceKm(paris, paris)).toBe(0);
  });

  it('draws a great circle that starts and ends at the given points', () => {
    const path = greatCircle([48.8566, 2.3522], [35.6762, 139.6503], 20);
    expect(path).toHaveLength(21);
    expect(path[0][0]).toBeCloseTo(2.3522, 3);
    expect(path[0][1]).toBeCloseTo(48.8566, 3);
    expect(path[20][0]).toBeCloseTo(139.6503, 3);
    expect(path[20][1]).toBeCloseTo(35.6762, 3);
  });

  it('keeps a path continuous across the antimeridian', () => {
    const path = greatCircle([35.6762, 139.6503], [34.0522, -118.2437], 40);
    for (let i = 1; i < path.length; i++) {
      expect(Math.abs(path[i][0] - path[i - 1][0])).toBeLessThan(30);
    }
  });

  it('returns a single point when both ends are the same', () => {
    expect(greatCircle([10, 20], [10, 20])).toEqual([[20, 10]]);
  });
});

describe('parseReverseGeocode', () => {
  it('prefers the city and returns the country details', () => {
    const place = parseReverseGeocode({
      address: { quarter: 'Al-Junaid', city: 'Baghdad', state: 'Baghdad Governorate', country: 'Iraq', country_code: 'iq' },
    });
    expect(place).toMatchObject({ name: 'Baghdad', country: 'Iraq', countryCode: 'IQ', admin1: 'Baghdad Governorate' });
    expect(place.flag).toBe('🇮🇶');
  });

  it('falls back to the province in open country, not a rural district', () => {
    const place = parseReverseGeocode({
      address: { municipality: 'Some Rural District', county: 'Some County', state: 'Khuzestan Province', country: 'Iran', country_code: 'ir' },
    });
    expect(place.name).toBe('Khuzestan Province');
    expect(place.admin1).toBe('');
  });

  it('returns null for open water and empty responses', () => {
    expect(parseReverseGeocode({ error: 'Unable to geocode' })).toBeNull();
    expect(parseReverseGeocode(null)).toBeNull();
    expect(parseReverseGeocode({ address: {} })).toBeNull();
  });
});

describe('localised names', () => {
  it('shows the Arabic name when there is one and the canonical name otherwise', () => {
    const kyoto = { name: 'Kyoto', localNames: { ar: 'كيوتو' } };
    expect(localizedName(kyoto, 'ar')).toBe('كيوتو');
    expect(localizedName(kyoto, 'en')).toBe('Kyoto');
    expect(localizedName({ name: 'Paris' }, 'ar')).toBe('Paris');
    expect(localizedName(null, 'ar')).toBe('');
  });

  it('names countries with the built-in region names, no network', () => {
    expect(localizedCountry('IQ', 'ar')).toBe('العراق');
    expect(localizedCountry('IQ', 'en')).toBe('Iraq');
    expect(localizedCountry('', 'en', 'Fallback')).toBe('Fallback');
  });
});

describe('destination storage', () => {
  const base = { name: 'Kyoto', countryCode: 'jp', latitude: 35.01, longitude: 135.77 };

  it('keeps valid local names and drops junk', () => {
    const destination = normalizeDestination({ ...base, localNames: { ar: ' كيوتو ', en: '', fr: 42 } });
    expect(destination.localNames).toEqual({ ar: 'كيوتو' });
  });

  it('defaults to no local names for older saved data', () => {
    expect(normalizeDestination(base).localNames).toEqual({});
    expect(normalizeDestination({ ...base, localNames: 'nope' }).localNames).toEqual({});
  });
});
