import { computed, ref, watch } from 'vue';

const STORAGE_KEY = 'fly_list_theme';
const THEMES = ['light', 'dark'];

function detectInitialTheme() {
  if (typeof window === 'undefined') return 'light';
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved && THEMES.includes(saved)) return saved;
  } catch {
    // storage unavailable
  }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

const theme = ref(detectInitialTheme());

watch(
  theme,
  (value) => {
    if (typeof document !== 'undefined') {
      document.documentElement.dataset.theme = value;
    }
    try {
      window.localStorage.setItem(STORAGE_KEY, value);
    } catch {
      // storage unavailable
    }
  },
  { immediate: true },
);

/**
 * Shared light/dark theme state. The value is written to `data-theme` on the
 * root element, which drives both daisyUI and Tailwind's `dark:` variants.
 */
export function useTheme() {
  const isDark = computed(() => theme.value === 'dark');

  function setTheme(value) {
    if (THEMES.includes(value)) theme.value = value;
  }

  function toggleTheme() {
    theme.value = theme.value === 'dark' ? 'light' : 'dark';
  }

  return { theme, isDark, setTheme, toggleTheme };
}
