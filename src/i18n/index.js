import { computed, ref, watch } from 'vue';
import en from './en.js';
import ar from './ar.js';

const MESSAGES = { en, ar };
const STORAGE_KEY = 'fly_list_locale';

/** @type {Array<'en' | 'ar'>} */
export const SUPPORTED_LOCALES = ['en', 'ar'];

/** BCP-47 tags used for Intl formatting. Arabic keeps Latin digits so numbers match place names. */
const INTL_TAGS = { en: 'en-GB', ar: 'ar-EG-u-nu-latn' };

function detectInitialLocale() {
  if (typeof window === 'undefined') return 'en';
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved && SUPPORTED_LOCALES.includes(saved)) return saved;
  } catch {
    // storage unavailable
  }
  const browser = (navigator.language || 'en').toLowerCase();
  return browser.startsWith('ar') ? 'ar' : 'en';
}

const locale = ref(detectInitialLocale());

function lookup(messages, path) {
  return path.split('.').reduce((node, part) => (node && typeof node === 'object' ? node[part] : undefined), messages);
}

function interpolate(template, params) {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (_, key) => (params[key] === undefined || params[key] === null ? '' : String(params[key])));
}

/**
 * Translate a dotted key, falling back to English and then to the key itself.
 *
 * @param {string} key
 * @param {Record<string, unknown>} [params]
 * @returns {string}
 */
export function t(key, params) {
  const current = lookup(MESSAGES[locale.value], key);
  const fallback = current === undefined ? lookup(MESSAGES.en, key) : current;
  if (typeof fallback !== 'string') return key;
  return interpolate(fallback, params);
}

function applyDocumentAttributes(value) {
  if (typeof document === 'undefined') return;
  document.documentElement.lang = value;
  document.documentElement.dir = value === 'ar' ? 'rtl' : 'ltr';
}

watch(
  locale,
  (value) => {
    applyDocumentAttributes(value);
    try {
      window.localStorage.setItem(STORAGE_KEY, value);
    } catch {
      // storage unavailable
    }
  },
  { immediate: true },
);

/**
 * Format an ISO date (YYYY-MM-DD) for display in the active locale.
 *
 * @param {string | null | undefined} iso
 * @param {Intl.DateTimeFormatOptions} [options]
 * @returns {string}
 */
export function formatDate(iso, options = { weekday: 'short', day: 'numeric', month: 'short' }) {
  if (!iso) return '';
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return iso;
  const date = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return new Intl.DateTimeFormat(INTL_TAGS[locale.value], options).format(date);
}

/**
 * Format a timestamp as a short time (or date and time when not today).
 *
 * @param {string | number | Date} value
 * @returns {string}
 */
export function formatTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();
  return new Intl.DateTimeFormat(
    INTL_TAGS[locale.value],
    sameDay ? { hour: 'numeric', minute: '2-digit' } : { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' },
  ).format(date);
}

/**
 * Composable giving components access to the shared locale state.
 */
export function useI18n() {
  const dir = computed(() => (locale.value === 'ar' ? 'rtl' : 'ltr'));
  const isRtl = computed(() => locale.value === 'ar');

  function setLocale(value) {
    if (SUPPORTED_LOCALES.includes(value)) locale.value = value;
  }

  function toggleLocale() {
    setLocale(locale.value === 'en' ? 'ar' : 'en');
  }

  return { locale, dir, isRtl, t, setLocale, toggleLocale, formatDate, formatTime };
}
