/** @type {import('tailwindcss').Config} */
const daisyThemes = require('daisyui/src/theming/themes');

// "Flight chart" palette: map-paper ground, navy ink, chart blue for actions,
// magenta kept for the route line and trip dates (the colour charts use for routes).
const light = {
  ...daisyThemes['light'],
  primary: '#1d5fa6',
  'primary-content': '#ffffff',
  secondary: '#3c5068',
  'secondary-content': '#ffffff',
  accent: '#a8286f',
  'accent-content': '#ffffff',
  neutral: '#15243b',
  'neutral-content': '#eef2ee',
  'base-100': '#ffffff',
  'base-200': '#eef2ee',
  'base-300': '#c9d3cc',
  'base-content': '#15243b',
  info: '#1d5fa6',
  'info-content': '#ffffff',
  success: '#2b7a4b',
  'success-content': '#ffffff',
  warning: '#b26a00',
  'warning-content': '#ffffff',
  error: '#b3261e',
  'error-content': '#ffffff',
  '--rounded-box': '1rem',
  '--rounded-btn': '0.75rem',
  '--rounded-badge': '0.75rem',
  '--animation-btn': '0.15s',
  '--btn-focus-scale': '0.98',
};

// Night chart: seamless deep space so the neon 3D Earth floats cleanly.
const dark = {
  ...daisyThemes['dark'],
  primary: '#38bdf8',
  'primary-content': '#041322',
  secondary: '#a5b9d1',
  'secondary-content': '#061224',
  accent: '#fbbf24',
  'accent-content': '#221500',
  neutral: '#172947',
  'neutral-content': '#eef4fb',
  'base-100': '#0d1930',
  'base-200': '#040916',
  'base-300': '#1d3257',
  'base-content': '#eef4fb',
  info: '#38bdf8',
  'info-content': '#041322',
  success: '#4ade80',
  'success-content': '#052010',
  warning: '#fbbf24',
  'warning-content': '#241600',
  error: '#f87171',
  'error-content': '#2d0a07',
  '--rounded-box': '1rem',
  '--rounded-btn': '0.75rem',
  '--rounded-badge': '0.75rem',
  '--animation-btn': '0.15s',
  '--btn-focus-scale': '0.98',
};

module.exports = {
  content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  // `dark:` utilities follow the daisyUI theme attribute instead of the OS setting,
  // so the in-app toggle controls both.
  darkMode: ['selector', '[data-theme="dark"]'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"IBM Plex Sans"', '"IBM Plex Sans Arabic"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(-4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.2s cubic-bezier(0.23, 1, 0.32, 1) both',
      },
    },
  },
  plugins: [require('daisyui')],
  daisyui: {
    themes: [{ light }, { dark }],
    logs: false,
  },
};
