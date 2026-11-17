/**
 * Natural-language date extraction for task titles.
 *
 * Supports English and Arabic phrases such as:
 *   "tomorrow", "next Friday", "in 3 days", "on 12 March", "Dec 5th", "2026-03-12"
 *   "غداً", "بعد غد", "الجمعة القادمة", "بعد 3 أيام", "12 مارس"
 *
 * All calculations happen in local time. Results are returned as YYYY-MM-DD
 * strings so they survive JSON storage without timezone drift.
 */

const MONTHS_EN = {
  january: 1,
  jan: 1,
  february: 2,
  feb: 2,
  march: 3,
  mar: 3,
  april: 4,
  apr: 4,
  may: 5,
  june: 6,
  jun: 6,
  july: 7,
  jul: 7,
  august: 8,
  aug: 8,
  september: 9,
  sep: 9,
  sept: 9,
  october: 10,
  oct: 10,
  november: 11,
  nov: 11,
  december: 12,
  dec: 12,
};

const MONTHS_AR = {
  يناير: 1,
  'كانون الثاني': 1,
  فبراير: 2,
  شباط: 2,
  مارس: 3,
  آذار: 3,
  اذار: 3,
  أبريل: 4,
  ابريل: 4,
  إبريل: 4,
  نيسان: 4,
  مايو: 5,
  أيار: 5,
  ايار: 5,
  يونيو: 6,
  حزيران: 6,
  يوليو: 7,
  تموز: 7,
  أغسطس: 8,
  اغسطس: 8,
  آب: 8,
  سبتمبر: 9,
  أيلول: 9,
  ايلول: 9,
  أكتوبر: 10,
  اكتوبر: 10,
  'تشرين الأول': 10,
  'تشرين الاول': 10,
  نوفمبر: 11,
  'تشرين الثاني': 11,
  ديسمبر: 12,
  'كانون الأول': 12,
  'كانون الاول': 12,
};

const WEEKDAYS_EN_FULL = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

/** Abbreviations only count when introduced by a cue ("on Fri", "next Sat"), so "sun cream" stays a task. */
const WEEKDAYS_EN_ABBR = {
  sun: 0,
  mon: 1,
  tue: 2,
  tues: 2,
  wed: 3,
  thu: 4,
  thur: 4,
  thurs: 4,
  fri: 5,
  sat: 6,
};

const WEEKDAYS_EN = { ...WEEKDAYS_EN_FULL, ...WEEKDAYS_EN_ABBR };

const WEEKDAYS_AR = {
  الأحد: 0,
  الاحد: 0,
  أحد: 0,
  احد: 0,
  الاثنين: 1,
  الإثنين: 1,
  الأثنين: 1,
  اثنين: 1,
  إثنين: 1,
  الثلاثاء: 2,
  ثلاثاء: 2,
  الثلاث: 2,
  الأربعاء: 3,
  الاربعاء: 3,
  أربعاء: 3,
  اربعاء: 3,
  الاربع: 3,
  الخميس: 4,
  خميس: 4,
  الجمعة: 5,
  جمعة: 5,
  الجمعه: 5,
  السبت: 6,
  سبت: 6,
};

const ARABIC_INDIC_DIGITS = /[٠-٩۰-۹]/g;

/** Convert Arabic-Indic digits to ASCII digits. */
export function normalizeDigits(text) {
  return text.replace(ARABIC_INDIC_DIGITS, (d) => {
    const code = d.charCodeAt(0);
    const base = code >= 0x06f0 ? 0x06f0 : 0x0660;
    return String(code - base);
  });
}

function pad(n) {
  return String(n).padStart(2, '0');
}

/** Format a Date as YYYY-MM-DD using local time. */
export function toISODate(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Parse YYYY-MM-DD into a local Date at midnight. Returns null for invalid input. */
export function fromISODate(iso) {
  if (!iso || typeof iso !== 'string') return null;
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isNaN(d.getTime()) ? null : d;
}

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function addMonths(date, months) {
  const d = new Date(date);
  const day = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + months);
  const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(day, lastDay));
  return d;
}

function isValidDay(year, month, day) {
  if (month < 1 || month > 12 || day < 1) return false;
  const lastDay = new Date(year, month, 0).getDate();
  return day <= lastDay;
}

/**
 * Build a date from month/day, choosing the year so the date is not in the past
 * (unless the year was given explicitly).
 */
function resolveMonthDay(now, month, day, explicitYear) {
  const year = explicitYear ?? now.getFullYear();
  if (!isValidDay(year, month, day)) return null;
  let d = new Date(year, month - 1, day);
  if (explicitYear === null && d < startOfDay(now)) {
    if (!isValidDay(year + 1, month, day)) return null;
    d = new Date(year + 1, month - 1, day);
  }
  return d;
}

/** Next occurrence of a weekday. `strict` skips today when it is that weekday. */
function nextWeekday(now, weekday, strict) {
  const today = startOfDay(now);
  let diff = (weekday - today.getDay() + 7) % 7;
  if (diff === 0 && strict) diff = 7;
  return addDays(today, diff);
}

function parseYear(raw) {
  if (!raw) return null;
  const n = Number(raw);
  if (raw.length === 2) return 2000 + n;
  return n;
}

/**
 * Extract a date from free text.
 *
 * @param {string} text
 * @param {{ now?: Date, locale?: 'en' | 'ar' }} [options]
 * @returns {{ date: string, match: string } | null}
 */
export function parseDateFromText(text, options = {}) {
  if (!text || typeof text !== 'string') return null;
  const now = options.now ? new Date(options.now) : new Date();
  const locale = options.locale || 'en';
  const source = normalizeDigits(text);
  const lower = source.toLowerCase();

  // 1. ISO date: 2026-03-12
  let m = lower.match(/\b(\d{4})-(\d{1,2})-(\d{1,2})\b/);
  if (m) {
    const y = Number(m[1]);
    const mo = Number(m[2]);
    const d = Number(m[3]);
    if (isValidDay(y, mo, d)) {
      return { date: toISODate(new Date(y, mo - 1, d)), match: m[0] };
    }
  }

  // 2. English "12 March [2026]" / "12th of March"
  const monthNamesEn = Object.keys(MONTHS_EN)
    .sort((a, b) => b.length - a.length)
    .join('|');
  m = lower.match(new RegExp(`\\b(\\d{1,2})(?:st|nd|rd|th)?(?:\\s+of)?\\s+(${monthNamesEn})\\b(?:\\.?,?\\s*(\\d{4}))?`));
  if (m) {
    const d = resolveMonthDay(now, MONTHS_EN[m[2]], Number(m[1]), m[3] ? Number(m[3]) : null);
    if (d) return { date: toISODate(d), match: m[0] };
  }

  // 3. English "March 12[th][, 2026]"
  m = lower.match(new RegExp(`\\b(${monthNamesEn})\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?\\b(?:,?\\s*(\\d{4}))?`));
  if (m) {
    const d = resolveMonthDay(now, MONTHS_EN[m[1]], Number(m[2]), m[3] ? Number(m[3]) : null);
    if (d) return { date: toISODate(d), match: m[0] };
  }

  // 4. Arabic "12 مارس [2026]"
  const monthNamesAr = Object.keys(MONTHS_AR)
    .sort((a, b) => b.length - a.length)
    .join('|');
  m = source.match(new RegExp(`(\\d{1,2})\\s+(?:من\\s+)?(${monthNamesAr})(?:\\s+(\\d{4}))?`));
  if (m) {
    const d = resolveMonthDay(now, MONTHS_AR[m[2]], Number(m[1]), m[3] ? Number(m[3]) : null);
    if (d) return { date: toISODate(d), match: m[0] };
  }

  // 5. Numeric "12/3", "12/03/2026", "12.03.2026" (dots need a full year so "3.5 kg"
  //    is not a date). Ambiguous forms use the locale convention:
  //    English → month/day, Arabic → day/month.
  const slashMatch = lower.match(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2}|\d{4}))?\b/);
  const dotMatch = slashMatch ? null : lower.match(/\b(\d{1,2})\.(\d{1,2})\.(\d{4})\b/);
  m = slashMatch || dotMatch;
  if (m) {
    const a = Number(m[1]);
    const b = Number(m[2]);
    const year = parseYear(m[3]);
    let month;
    let day;
    if (a > 12 && b <= 12) {
      day = a;
      month = b;
    } else if (b > 12 && a <= 12) {
      month = a;
      day = b;
    } else if (dotMatch || locale === 'ar') {
      // Dotted dates are day.month.year everywhere they are used.
      day = a;
      month = b;
    } else {
      month = a;
      day = b;
    }
    const d = resolveMonthDay(now, month, day, year);
    if (d) return { date: toISODate(d), match: m[0] };
  }

  // 6. Relative phrases (English)
  if (/\b(?:day after tomorrow|overmorrow)\b/.test(lower)) {
    return { date: toISODate(addDays(startOfDay(now), 2)), match: 'day after tomorrow' };
  }
  m = lower.match(/\b(tomorrow|tmrw|tmr)\b/);
  if (m) return { date: toISODate(addDays(startOfDay(now), 1)), match: m[0] };
  m = lower.match(/\b(today|tonight)\b/);
  if (m) return { date: toISODate(startOfDay(now)), match: m[0] };

  m = lower.match(/\bin\s+(\d+|a|an|one|two|three|four|five|six|seven|eight|nine|ten)\s+(day|days|week|weeks|month|months)\b/);
  if (m) {
    const n = wordToNumber(m[1]);
    const unit = m[2];
    const base = startOfDay(now);
    const d = unit.startsWith('day') ? addDays(base, n) : unit.startsWith('week') ? addDays(base, n * 7) : addMonths(base, n);
    return { date: toISODate(d), match: m[0] };
  }

  m = lower.match(/\bnext\s+(week|month|weekend)\b/);
  if (m) {
    const base = startOfDay(now);
    if (m[1] === 'week') return { date: toISODate(addDays(base, 7)), match: m[0] };
    if (m[1] === 'month') return { date: toISODate(addMonths(base, 1)), match: m[0] };
    return { date: toISODate(nextWeekday(now, 6, true)), match: m[0] };
  }
  m = lower.match(/\bthis\s+weekend\b/);
  if (m) return { date: toISODate(nextWeekday(now, 6, false)), match: m[0] };

  const weekdayFullEn = Object.keys(WEEKDAYS_EN_FULL).join('|');
  const weekdayAbbrEn = Object.keys(WEEKDAYS_EN_ABBR)
    .sort((a, b) => b.length - a.length)
    .join('|');
  m =
    lower.match(new RegExp(`\\b(?:(next|this|coming|on)\\s+)?(${weekdayFullEn})\\b`)) ||
    lower.match(new RegExp(`\\b(next|this|coming|on)\\s+(${weekdayAbbrEn})\\b\\.?`));
  if (m) {
    const strict = m[1] === 'next';
    return { date: toISODate(nextWeekday(now, WEEKDAYS_EN[m[2]], strict)), match: m[0] };
  }

  // 7. Relative phrases (Arabic)
  if (/بعد\s*(?:غد|غدا|غداً|بكرة|بكرا|بكره)/.test(source)) {
    return { date: toISODate(addDays(startOfDay(now), 2)), match: 'بعد غد' };
  }
  m = source.match(/(?:^|\s)(غدا|غداً|غدًا|غد|بكرة|بكرا|بكره)(?=\s|$|[،,.!؟?])/);
  if (m) return { date: toISODate(addDays(startOfDay(now), 1)), match: m[1] };
  m = source.match(/(?:^|\s)(اليوم|الليلة|النهاردة|النهارده)(?=\s|$|[،,.!؟?])/);
  if (m) return { date: toISODate(startOfDay(now)), match: m[1] };

  m = source.match(/بعد\s+(\d+)\s*(يوم|أيام|ايام|أسبوع|اسبوع|أسابيع|اسابيع|شهر|أشهر|اشهر|شهور)/);
  if (m) {
    const n = Number(m[1]);
    const unit = m[2];
    const base = startOfDay(now);
    const d = /يوم|أيام|ايام/.test(unit) ? addDays(base, n) : /أسبوع|اسبوع|أسابيع|اسابيع/.test(unit) ? addDays(base, n * 7) : addMonths(base, n);
    return { date: toISODate(d), match: m[0] };
  }
  m = source.match(/بعد\s+(يومين|أسبوعين|اسبوعين|شهرين|أسبوع|اسبوع|شهر)(?=\s|$|[،,.!؟?])/);
  if (m) {
    const base = startOfDay(now);
    const unit = m[1];
    let d;
    if (unit === 'يومين') d = addDays(base, 2);
    else if (/أسبوعين|اسبوعين/.test(unit)) d = addDays(base, 14);
    else if (unit === 'شهرين') d = addMonths(base, 2);
    else if (unit === 'شهر') d = addMonths(base, 1);
    else d = addDays(base, 7);
    return { date: toISODate(d), match: m[0] };
  }
  m = source.match(/(الأسبوع|الاسبوع|الشهر)\s+(القادم|الجاي|المقبل|الجاية|القادمة)/);
  if (m) {
    const base = startOfDay(now);
    return { date: toISODate(/الشهر/.test(m[1]) ? addMonths(base, 1) : addDays(base, 7)), match: m[0] };
  }

  const weekdayNamesAr = Object.keys(WEEKDAYS_AR)
    .sort((a, b) => b.length - a.length)
    .join('|');
  m = source.match(new RegExp(`(?:^|\\s)(?:يوم\\s+)?(${weekdayNamesAr})(?:\\s+(القادم|الجاي|المقبل|الجاية|القادمة|ده|هذا))?(?=\\s|$|[،,.!؟?])`));
  if (m) {
    const strict = Boolean(m[2]) && !/ده|هذا/.test(m[2]);
    return { date: toISODate(nextWeekday(now, WEEKDAYS_AR[m[1]], strict)), match: m[0].trim() };
  }

  return null;
}

function wordToNumber(word) {
  const map = { a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10 };
  if (map[word] !== undefined) return map[word];
  const n = Number(word);
  return Number.isFinite(n) ? n : 1;
}

/**
 * Whole days between today and the given ISO date (negative when in the past).
 *
 * @param {string} iso
 * @param {Date} [now]
 * @returns {number | null}
 */
export function daysUntil(iso, now = new Date()) {
  const target = fromISODate(iso);
  if (!target) return null;
  const today = startOfDay(now);
  return Math.round((target - today) / 86400000);
}
