import { describe, expect, it } from 'vitest';
import { getLocalGlobeLabels, latLonToTileXY } from '../src/services/globePlaces.js';

describe('globePlaces helpers', () => {
  it('builds bilingual baseline labels from the local gazetteer', () => {
    const labels = getLocalGlobeLabels();
    expect(labels.length).toBeGreaterThan(20);

    const japan = labels.find((l) => l.nameEn === 'Japan' && l.kind === 'country');
    expect(japan).toBeDefined();
    expect(japan.nameAr).toBeTruthy();
    expect(Number.isFinite(japan.lat)).toBe(true);
    expect(Number.isFinite(japan.lon)).toBe(true);

    const paris = labels.find((l) => l.nameEn === 'Paris' && l.kind === 'city');
    expect(paris).toBeDefined();
    expect(paris.nameAr).toBeTruthy();

    const missingAr = labels.filter((l) => l.nameAr === l.nameEn).map((l) => l.nameEn);
    expect(missingAr).toEqual([]);
  });

  it('maps latitude and longitude to clamped slippy tile coordinates', () => {
    const paris = latLonToTileXY(48.8566, 2.3522, 2);
    expect(paris).toEqual({ x: 2, y: 1 });

    const tokyo = latLonToTileXY(35.6762, 139.6503, 2);
    expect(tokyo).toEqual({ x: 3, y: 1 });

    const ny = latLonToTileXY(40.7128, -74.006, 2);
    expect(ny).toEqual({ x: 1, y: 1 });

    const extreme = latLonToTileXY(89.9, 180, 2);
    expect(extreme.x).toBeGreaterThanOrEqual(0);
    expect(extreme.x).toBeLessThan(4);
    expect(extreme.y).toBeGreaterThanOrEqual(0);
    expect(extreme.y).toBeLessThan(4);
  });
});
