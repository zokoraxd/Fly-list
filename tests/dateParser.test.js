import { describe, expect, it } from 'vitest';
import { daysUntil, fromISODate, normalizeDigits, parseDateFromText, toISODate } from '../src/utils/dateParser.js';

// Saturday 31 October 2026, 10:00 local time
const NOW = new Date(2026, 9, 31, 10, 0, 0);

function parse(text, locale = 'en') {
  return parseDateFromText(text, { now: NOW, locale })?.date ?? null;
}

describe('parseDateFromText — English', () => {
  it('parses ISO dates', () => {
    expect(parse('Conference 2027-03-12')).toBe('2027-03-12');
  });

  it('parses day-month and month-day with optional ordinal and year', () => {
    expect(parse('Flight on 12 March')).toBe('2027-03-12');
    expect(parse('Flight on 12th of March 2027')).toBe('2027-03-12');
    expect(parse('Flight on March 12th')).toBe('2027-03-12');
    expect(parse('Dec 5 trip')).toBe('2026-12-05');
    expect(parse('Sept 1, 2027')).toBe('2027-09-01');
  });

  it('rolls past month-days into next year when no year is given', () => {
    expect(parse('Trip on 10 October')).toBe('2027-10-10');
    expect(parse('Trip on 31 October')).toBe('2026-10-31');
  });

  it('parses numeric dates using the locale convention', () => {
    expect(parse('Dentist 11/20')).toBe('2026-11-20');
    expect(parse('Dentist 20/11')).toBe('2026-11-20');
    expect(parse('Dentist 3/4', 'en')).toBe('2027-03-04');
    expect(parse('Dentist 3/4', 'ar')).toBe('2027-04-03');
    expect(parse('Trip 25/12/2027')).toBe('2027-12-25');
  });

  it('parses relative words', () => {
    expect(parse('Do it today')).toBe('2026-10-31');
    expect(parse('Check in tomorrow')).toBe('2026-11-01');
    expect(parse('Day after tomorrow')).toBe('2026-11-02');
    expect(parse('in 3 days')).toBe('2026-11-03');
    expect(parse('in two weeks')).toBe('2026-11-14');
    expect(parse('in a month')).toBe('2026-11-30');
    expect(parse('next week')).toBe('2026-11-07');
    expect(parse('next month')).toBe('2026-11-30');
  });

  it('parses weekdays', () => {
    // NOW is a Saturday.
    expect(parse('Flight on Friday')).toBe('2026-11-06');
    expect(parse('Flight next Friday')).toBe('2026-11-06');
    expect(parse('Flight this Saturday')).toBe('2026-10-31');
    expect(parse('Flight next Saturday')).toBe('2026-11-07');
    expect(parse('Flight on Mon')).toBe('2026-11-02');
    expect(parse('Flight on Fri.')).toBe('2026-11-06');
    expect(parse('next weekend')).toBe('2026-11-07');
  });

  it('does not treat weekday abbreviations without a cue as dates', () => {
    expect(parse('Buy sun cream')).toBeNull();
    expect(parse('I sat on it')).toBeNull();
  });

  it('does not treat decimals as dates', () => {
    expect(parse('Buy 3.5 kg of coffee')).toBeNull();
    expect(parse('Pay 12.50')).toBeNull();
    expect(parse('Meeting 12.03.2027')).toBe('2027-03-12');
  });

  it('returns the matched text', () => {
    const result = parseDateFromText('Flight to Tokyo next Friday', { now: NOW });
    expect(result?.match).toBe('next friday');
  });

  it('returns null when there is no date', () => {
    expect(parse('Flight to Tokyo')).toBeNull();
    expect(parse('Buy 3 adapters')).toBeNull();
    expect(parse('')).toBeNull();
    expect(parse('Pay bill on 31/2')).toBeNull();
  });
});

describe('parseDateFromText — Arabic', () => {
  it('parses relative words', () => {
    expect(parse('اتصل بالفندق اليوم', 'ar')).toBe('2026-10-31');
    expect(parse('رحلة غداً', 'ar')).toBe('2026-11-01');
    expect(parse('رحلة بكرة', 'ar')).toBe('2026-11-01');
    expect(parse('رحلة بعد غد', 'ar')).toBe('2026-11-02');
    expect(parse('بعد 3 أيام', 'ar')).toBe('2026-11-03');
    expect(parse('بعد أسبوعين', 'ar')).toBe('2026-11-14');
    expect(parse('بعد يومين', 'ar')).toBe('2026-11-02');
    expect(parse('بعد أسبوع', 'ar')).toBe('2026-11-07');
    expect(parse('الأسبوع القادم', 'ar')).toBe('2026-11-07');
    expect(parse('الشهر الجاي', 'ar')).toBe('2026-11-30');
  });

  it('parses weekdays', () => {
    expect(parse('رحلة إلى طوكيو الجمعة القادمة', 'ar')).toBe('2026-11-06');
    expect(parse('موعد يوم الاثنين', 'ar')).toBe('2026-11-02');
    expect(parse('السبت ده', 'ar')).toBe('2026-10-31');
    expect(parse('السبت القادم', 'ar')).toBe('2026-11-07');
  });

  it('parses month names and Arabic-Indic digits', () => {
    expect(parse('رحلة 12 مارس', 'ar')).toBe('2027-03-12');
    expect(parse('رحلة ١٢ مارس ٢٠٢٧', 'ar')).toBe('2027-03-12');
    expect(parse('رحلة 5 كانون الأول', 'ar')).toBe('2026-12-05');
  });
});

describe('helpers', () => {
  it('normalizes Arabic-Indic digits', () => {
    expect(normalizeDigits('١٢/٠٣/٢٠٢٧')).toBe('12/03/2027');
    expect(normalizeDigits('۱۲')).toBe('12');
  });

  it('round-trips ISO dates in local time', () => {
    const date = fromISODate('2026-02-28');
    expect(date.getFullYear()).toBe(2026);
    expect(date.getMonth()).toBe(1);
    expect(date.getDate()).toBe(28);
    expect(toISODate(date)).toBe('2026-02-28');
    expect(fromISODate('nope')).toBeNull();
  });

  it('computes whole days until a date', () => {
    expect(daysUntil('2026-11-01', NOW)).toBe(1);
    expect(daysUntil('2026-10-31', NOW)).toBe(0);
    expect(daysUntil('2026-10-29', NOW)).toBe(-2);
    expect(daysUntil('bad', NOW)).toBeNull();
  });
});
