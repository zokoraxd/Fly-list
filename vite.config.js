import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  // Relative asset paths so the build works from any sub-path (GitHub Pages, Netlify, S3…).
  base: './',
  build: {
    sourcemap: false,
    // The globe (MapLibre) is loaded on demand through a dynamic import, so it gets its own chunk
    // and the first page load stays small. Its size is expected.
    chunkSizeWarningLimit: 1100,
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.js'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.js'],
    },
  },
});
