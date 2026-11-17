import { describe, expect, it } from 'vitest';
import { buildBackup, buildMarkdown, buildPrintHtml, destinationsInUse, parseBackup, sortTasksForExport } from '../src/utils/exportUtils.js';
import { escapeHtml } from '../src/utils/escapeHtml.js';
import en from '../src/i18n/en.js';

function t(key, params = {}) {
  const value = key.split('.').reduce((node, part) => node?.[part], en) ?? key;
  return value.replace(/\{(\w+)\}/g, (_, k) => String(params[k] ?? ''));
}

const ctx = { t, locale: 'en', formatDate: (iso) => iso };

const destinations = {
  'Paris|FR': {
    key: 'Paris|FR',
    name: 'Paris',
    country: 'France',
    flag: '🇫🇷',
    weather: { current: { temperature: 12, conditionKey: 'rain', icon: '🌧️' }, daily: [] },
  },
  'Tokyo|JP': { key: 'Tokyo|JP', name: 'Tokyo', country: 'Japan', flag: '🇯🇵', weather: null },
};

const tasks = [
  { id: '1', title: 'Pack <b>bold</b> socks', status: 'completed', dueDate: null, destinationKey: null, createdAt: '2026-10-01T00:00:00Z' },
  { id: '2', title: 'Flight to Tokyo', status: 'planned', dueDate: '2026-12-01', destinationKey: 'Tokyo|JP', createdAt: '2026-10-02T00:00:00Z' },
  { id: '3', title: 'Flight to Paris', status: 'in-progress', dueDate: '2026-11-15', destinationKey: 'Paris|FR', createdAt: '2026-10-03T00:00:00Z' },
];

describe('escapeHtml', () => {
  it('escapes the five dangerous characters', () => {
    expect(escapeHtml(`<img src=x onerror="alert('x')">&`)).toBe('&lt;img src=x onerror=&quot;alert(&#39;x&#39;)&quot;&gt;&amp;');
    expect(escapeHtml(null)).toBe('');
    expect(escapeHtml(12)).toBe('12');
  });
});

describe('sorting', () => {
  it('orders dated tasks first, soonest first, then undated by creation', () => {
    expect(sortTasksForExport(tasks).map((t) => t.id)).toEqual(['3', '2', '1']);
  });

  it('lists destinations in trip order without duplicates', () => {
    const more = [
      ...tasks,
      { id: '4', title: 'Louvre', status: 'planned', dueDate: '2026-11-16', destinationKey: 'Paris|FR', createdAt: '2026-10-04T00:00:00Z' },
    ];
    expect(destinationsInUse(more, destinations).map((d) => d.name)).toEqual(['Paris', 'Tokyo']);
  });
});

describe('buildMarkdown', () => {
  it('renders destinations, checkboxes, dates and tags', () => {
    const md = buildMarkdown(tasks, destinations, ctx);
    expect(md).toContain('# ✈️ My Fly-List Itinerary');
    expect(md).toContain('- **🇫🇷 Paris (France)**: 12°C, Rain 🌧️');
    expect(md).toContain('- **🇯🇵 Tokyo (Japan)**: Weather unavailable');
    expect(md).toContain('- [ ] Flight to Paris 📅 2026-11-15 [🇫🇷 Paris]');
    expect(md).toContain('- [x] Pack <b>bold</b> socks');
    expect(md.indexOf('Flight to Paris')).toBeLessThan(md.indexOf('Flight to Tokyo'));
  });

  it('handles an empty list', () => {
    const md = buildMarkdown([], {}, ctx);
    expect(md).toContain('_No items yet._');
    expect(md).not.toContain('Destinations');
  });
});

describe('buildPrintHtml', () => {
  it('escapes user content', () => {
    const html = buildPrintHtml(tasks, destinations, ctx);
    expect(html).toContain('Pack &lt;b&gt;bold&lt;/b&gt; socks');
    expect(html).not.toContain('<b>bold</b>');
    expect(html).toContain('lang="en" dir="ltr"');
    expect(html).not.toContain('<script');
  });

  it('switches direction for Arabic', () => {
    expect(buildPrintHtml([], {}, { ...ctx, locale: 'ar' })).toContain('dir="rtl"');
  });
});

describe('backup round-trip', () => {
  it('serialises and restores state', () => {
    const state = {
      tasks,
      destinations: { 'Paris|FR': { ...destinations['Paris|FR'], countryCode: 'FR', latitude: 48.8, longitude: 2.3 } },
      dismissedSuggestions: ['Paris|FR:rain'],
    };
    const json = buildBackup(state);
    const parsed = JSON.parse(json);
    expect(parsed.app).toBe('fly-list');

    const restored = parseBackup(json);
    expect(restored.tasks).toHaveLength(3);
    expect(restored.tasks.find((t) => t.id === '2')).toMatchObject({ destinationKey: null, detection: 'none' });
    expect(restored.tasks.find((t) => t.id === '3')?.destinationKey).toBe('Paris|FR');
    expect(restored.dismissedSuggestions).toEqual(['Paris|FR:rain']);
    expect(restored.seeded).toBe(true);
  });

  it('accepts a raw state object and rejects junk', () => {
    expect(parseBackup(JSON.stringify({ tasks: [] })).tasks).toEqual([]);
    expect(() => parseBackup('{"hello":"world"}')).toThrow();
    expect(() => parseBackup('not json')).toThrow();
  });
});
