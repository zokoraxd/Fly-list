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

// Night chart: navy, not black.
const dark = {
  ...daisyThemes['dark'],
  primary: '#7ab0ec',
  'primary-content': '#0b1626',
  secondary: '#9db0c6',
  'secondary-content': '#0b1626',
  accent: '#ea92bf',
  'accent-content': '#2a0b1c',
  neutral: '#223350',
  'neutral-content': '#e6ecf2',
  'base-100': '#18263d',
  'base-200': '#101a2a',
  'base-300': '#2c3d5a',
  'base-content': '#e6ecf2',
  info: '#7ab0ec',
  'info-content': '#0b1626',
  success: '#6cc08b',
  'success-content': '#0a1f13',
  warning: '#e7b25c',
  'warning-content': '#2a1a00',
  error: '#f09a93',
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
