import { describe, expect, it } from 'vitest';
import en from '../src/i18n/en.js';
import ar from '../src/i18n/ar.js';
import { interpretWeatherCode } from '../src/services/travelApi.js';

function flattenKeys(obj, prefix = '') {
  return Object.entries(obj).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return value && typeof value === 'object' ? flattenKeys(value, path) : [path];
  });
}

function placeholders(str) {
  return [...str.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
}

describe('translation dictionaries', () => {
  const enKeys = flattenKeys(en).sort();
  const arKeys = flattenKeys(ar).sort();

  it('have identical key sets', () => {
    expect(arKeys).toEqual(enKeys);
  });

  it('use the same placeholders in both languages', () => {
    for (const key of enKeys) {
      const enValue = key.split('.').reduce((n, p) => n[p], en);
      const arValue = key.split('.').reduce((n, p) => n[p], ar);
      expect(placeholders(arValue), key).toEqual(placeholders(enValue));
    }
  });

  it('have no empty strings', () => {
    for (const key of enKeys) {
      expect(
        key.split('.').reduce((n, p) => n[p], en),
        key,
      ).not.toBe('');
      expect(
        key.split('.').reduce((n, p) => n[p], ar),
        key,
      ).not.toBe('');
    }
  });

  it('cover every weather condition key the API can produce', () => {
    const codes = [0, 1, 2, 3, 45, 48, 51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 71, 73, 75, 77, 80, 81, 82, 85, 86, 95, 96, 99, 999];
    for (const code of codes) {
      const { key } = interpretWeatherCode(code);
      expect(en.weather[key], `en weather.${key}`).toBeTruthy();
      expect(ar.weather[key], `ar weather.${key}`).toBeTruthy();
    }
  });
});
