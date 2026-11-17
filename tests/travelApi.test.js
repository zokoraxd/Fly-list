import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  detectPlace,
  extractGeocodeQuery,
  fetchTouristInfo,
  fetchWeather,
  geocodePlace,
  getForecastForDate,
  interpretWeatherCode,
  isWeatherStale,
  makeDestinationKey,
  WEATHER_TTL_MS,
} from '../src/services/travelApi.js';
import { getCountryFlag } from '../src/utils/flags.js';

function jsonResponse(body, ok = true, status = 200) {
  return Promise.resolve({ ok, status, json: () => Promise.resolve(body) });
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('interpretWeatherCode', () => {
  it('maps every WMO group', () => {
    expect(interpretWeatherCode(0).key).toBe('clear');
    expect(interpretWeatherCode(3).key).toBe('overcast');
    expect(interpretWeatherCode(48).key).toBe('fog');
    expect(interpretWeatherCode(56).key).toBe('freezingDrizzle');
    expect(interpretWeatherCode(65).key).toBe('rain');
    expect(interpretWeatherCode(67).key).toBe('freezingRain');
    expect(interpretWeatherCode(75).key).toBe('snow');
    expect(interpretWeatherCode(77).key).toBe('snowGrains');
    expect(interpretWeatherCode(82).key).toBe('showers');
    expect(interpretWeatherCode(86).key).toBe('snowShowers');
    expect(interpretWeatherCode(99).key).toBe('thunderstorm');
  });

  it('does not pretend unknown codes are clear', () => {
    expect(interpretWeatherCode(123).key).toBe('unknown');
    expect(interpretWeatherCode(undefined).key).toBe('unknown');
  });
});

describe('getCountryFlag', () => {
  it('builds regional indicator flags', () => {
    expect(getCountryFlag('EG')).toBe('🇪🇬');
    expect(getCountryFlag('jp')).toBe('🇯🇵');
  });

  it('falls back to a globe for bad input', () => {
    expect(getCountryFlag('')).toBe('🌐');
    expect(getCountryFlag('EGY')).toBe('🌐');
    expect(getCountryFlag('1A')).toBe('🌐');
    expect(getCountryFlag(null)).toBe('🌐');
  });
});

describe('extractGeocodeQuery', () => {
  it('pulls the place out of travel phrases', () => {
    expect(extractGeocodeQuery('Flight to Kuala Lumpur on Monday')).toBe('Kuala Lumpur');
    expect(extractGeocodeQuery('hotel in Zanzibar for 3 nights')).toBe('Zanzibar');
    expect(extractGeocodeQuery('Visit Ljubljana next week')).toBe('Ljubljana');
    expect(extractGeocodeQuery('Weekend in the Cotswolds')).toBe('Cotswolds');
    expect(extractGeocodeQuery('رحلة إلى سمرقند')).toBe('سمرقند');
  });

  it('accepts bare capitalised names', () => {
    expect(extractGeocodeQuery('Marrakesh')).toBe('Marrakesh');
    expect(extractGeocodeQuery('Kuala Lumpur')).toBe('Kuala Lumpur');
  });

  it('never sends ordinary tasks to the geocoder', () => {
    expect(extractGeocodeQuery('Renew passport')).toBeNull();
    expect(extractGeocodeQuery('Call mom tomorrow')).toBeNull();
    expect(extractGeocodeQuery('buy sunscreen')).toBeNull();
    expect(extractGeocodeQuery('Pack passport, power adapter and headphones')).toBeNull();
    expect(extractGeocodeQuery('Book dentist')).toBeNull();
    expect(extractGeocodeQuery('')).toBeNull();
  });
});

describe('geocodePlace', () => {
  it('skips non-populated features and returns the first real place', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        jsonResponse({
          results: [
            { name: 'Nowhere Creek', feature_code: 'STM', country_code: 'US', latitude: 1, longitude: 2 },
            {
              name: 'Marrakesh',
              feature_code: 'PPLA',
              population: 995871,
              country_code: 'MA',
              country: 'Morocco',
              latitude: 31.63,
              longitude: -7.99,
              timezone: 'Africa/Casablanca',
              admin1: 'Marrakesh-Safi',
            },
          ],
        }),
      ),
    );

    const place = await geocodePlace('Marrakesh');
    expect(place).toMatchObject({ name: 'Marrakesh', country: 'Morocco', countryCode: 'MA', flag: '🇲🇦', timezone: 'Africa/Casablanca' });
  });

  it('returns null when nothing acceptable comes back', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => jsonResponse({ generationtime_ms: 0.1 })),
    );
    expect(await geocodePlace('Renew passport')).toBeNull();
  });
});

describe('detectPlace', () => {
  it('uses the local gazetteer without touching the network', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    const place = await detectPlace('Flight to Tokyo');
    expect(place).toMatchObject({ name: 'Tokyo', source: 'local', key: 'Tokyo|JP' });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('returns null for plain tasks without calling the geocoder', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    expect(await detectPlace('Renew passport')).toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('swallows network errors from the geocoder', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject(new TypeError('offline'))),
    );
    expect(await detectPlace('Flight to Ljubljana')).toBeNull();
  });
});

describe('fetchWeather', () => {
  it('normalises the Open-Meteo response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        jsonResponse({
          timezone: 'Africa/Cairo',
          current: { temperature_2m: 25.5, relative_humidity_2m: 39, weather_code: 3, wind_speed_10m: 4.3 },
          daily: {
            time: ['2026-10-31', '2026-11-01'],
            weather_code: [3, 61],
            temperature_2m_max: [29.4, 27.1],
            temperature_2m_min: [18.2, 17.6],
            precipitation_probability_max: [0, 60],
            wind_speed_10m_max: [12.2, 30.8],
          },
        }),
      ),
    );

    const weather = await fetchWeather(30.04, 31.23);
    expect(weather.timezone).toBe('Africa/Cairo');
    expect(weather.current).toEqual({ temperature: 26, humidity: 39, windSpeed: 4, conditionKey: 'overcast', icon: '☁️' });
    expect(weather.daily).toHaveLength(2);
    expect(weather.daily[1]).toMatchObject({ date: '2026-11-01', max: 27, min: 18, precipProb: 60, windMax: 31, conditionKey: 'rain' });
    expect(new Date(weather.fetchedAt).getTime()).toBeGreaterThan(0);
  });

  it('throws on HTTP errors so callers can show a retry', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => jsonResponse({}, false, 500)),
    );
    await expect(fetchWeather(0, 0)).rejects.toThrow();
  });
});

describe('fetchTouristInfo', () => {
  it('skips disambiguation pages and tries the next title', async () => {
    const calls = [];
    vi.stubGlobal(
      'fetch',
      vi.fn((rawUrl) => {
        const url = decodeURIComponent(rawUrl);
        calls.push(url);
        if (url.endsWith('/summary/Washington')) return jsonResponse({ type: 'disambiguation', title: 'Washington', extract: 'Topics…' });
        if (url.endsWith('/summary/Washington,_D.C.')) {
          return jsonResponse({
            type: 'standard',
            title: 'Washington, D.C.',
            description: 'Capital city of the United States',
            extract: 'Washington, D.C. is…',
            content_urls: { desktop: { page: 'https://en.wikipedia.org/wiki/Washington,_D.C.' } },
          });
        }
        return jsonResponse({}, false, 404);
      }),
    );

    const info = await fetchTouristInfo({ name: 'Washington', country: 'United States', wiki: 'Washington, D.C.' });
    expect(info?.title).toBe('Washington, D.C.');
    expect(info?.lang).toBe('en');
    expect(calls[0]).toContain('Washington,_D.C.');
  });

  it('falls back to search when direct titles fail', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((rawUrl) => {
        const url = decodeURIComponent(rawUrl);
        if (url.includes('list=search')) return jsonResponse({ query: { search: [{ title: 'Paris, Texas' }] } });
        if (url.endsWith('/summary/Paris,_Texas'))
          return jsonResponse({ type: 'standard', title: 'Paris, Texas', description: 'City in Texas', extract: 'Paris is a city…' });
        return jsonResponse({}, false, 404);
      }),
    );

    const info = await fetchTouristInfo({ name: 'Parris', country: 'United States', admin1: 'Texas' });
    expect(info?.title).toBe('Paris, Texas');
  });

  it('prefers an Arabic article when the locale is Arabic', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((url) => {
        if (url.startsWith('https://en.wikipedia.org/api/rest_v1/page/summary/Cairo'))
          return jsonResponse({ type: 'standard', title: 'Cairo', description: 'Capital of Egypt', extract: 'Cairo is…' });
        if (url.includes('prop=langlinks')) return jsonResponse({ query: { pages: { 1: { langlinks: [{ lang: 'ar', '*': 'القاهرة' }] } } } });
        if (url.startsWith('https://ar.wikipedia.org'))
          return jsonResponse({ type: 'standard', title: 'القاهرة', description: 'عاصمة مصر', extract: 'القاهرة هي…' });
        return jsonResponse({}, false, 404);
      }),
    );

    const info = await fetchTouristInfo({ name: 'Cairo', country: 'Egypt' }, { locale: 'ar' });
    expect(info?.lang).toBe('ar');
    expect(info?.title).toBe('القاهرة');
  });
});

describe('forecast helpers', () => {
  const weather = {
    fetchedAt: new Date().toISOString(),
    current: { temperature: 20 },
    daily: [
      { date: '2026-11-01', max: 20 },
      { date: '2026-11-02', max: 21 },
    ],
  };

  it('finds the forecast for a given day', () => {
    expect(getForecastForDate(weather, '2026-11-02')?.max).toBe(21);
    expect(getForecastForDate(weather, '2026-12-25')).toBeNull();
    expect(getForecastForDate(null, '2026-11-02')).toBeNull();
    expect(getForecastForDate(weather, null)).toBeNull();
  });

  it('knows when weather is stale', () => {
    const now = Date.now();
    expect(isWeatherStale(null)).toBe(true);
    expect(isWeatherStale({ fetchedAt: new Date(now - 1000).toISOString() }, now)).toBe(false);
    expect(isWeatherStale({ fetchedAt: new Date(now - WEATHER_TTL_MS - 1).toISOString() }, now)).toBe(true);
    expect(isWeatherStale({ fetchedAt: 'garbage' }, now)).toBe(true);
  });

  it('builds stable destination keys', () => {
    expect(makeDestinationKey({ name: 'Paris', countryCode: 'FR' })).toBe('Paris|FR');
    expect(makeDestinationKey({ name: 'Paris' })).toBe('Paris|');
  });
});
