<template>
  <svg
    class="shrink-0"
    :class="[flip ? 'rtl:-scale-x-100' : '']"
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.75"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    <path v-for="d in icon.paths" :key="d" :d="d" />
    <circle v-for="c in icon.circles || []" :key="c.join()" :cx="c[0]" :cy="c[1]" :r="c[2]" :fill="c[3] ? 'currentColor' : 'none'" />
    <rect v-for="r in icon.rects || []" :key="r.join()" :x="r[0]" :y="r[1]" :width="r[2]" :height="r[3]" :rx="r[4]" />
    <path v-for="d in icon.solid || []" :key="d" :d="d" fill="currentColor" />
  </svg>
</template>

<script setup>
import { computed } from 'vue';

/**
 * Small hand-drawn icon set (24px grid, 1.75 stroke). Used for interface controls only;
 * flags and weather symbols stay emoji because they are content.
 */
const ICONS = {
  plane: { paths: ['M21.5 2.5 2.5 10l7.5 3 3 7.5 8.5-18z', 'M10 13 21.5 2.5'] },
  sun: { circles: [[12, 12, 4]], paths: ['M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4'] },
  moon: { paths: ['M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z'] },
  pencil: { paths: ['M4 20l1-4L16.5 4.5a2.1 2.1 0 0 1 3 3L8 19l-4 1z', 'M14.5 6.5l3 3'] },
  trash: { paths: ['M4 7h16', 'M9 7V4h6v3', 'M6 7l1 13h10l1-13', 'M10 11v5M14 11v5'] },
  calendar: { rects: [[3.5, 5, 17, 15.5, 3.5]], paths: ['M3.5 10h17', 'M8 3v4M16 3v4'] },
  pin: { paths: ['M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z'], circles: [[12, 10, 2.3]] },
  x: { paths: ['M6 6l12 12M18 6L6 18'] },
  refresh: { paths: ['M20 11a8 8 0 0 0-14.3-4.3L4 8.5', 'M4 4v4.5h4.5', 'M4 13a8 8 0 0 0 14.3 4.3L20 15.5', 'M20 20v-4.5h-4.5'] },
  check: { paths: ['M5 12.5l4.5 4.5L19 7.5'] },
  chevron: { paths: ['M6 9l6 6 6-6'] },
  globe: { circles: [[12, 12, 9]], paths: ['M3 12h18', 'M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3z'] },
  list: { paths: ['M8 6h12M8 12h12M8 18h12', 'M4 6h.01M4 12h.01M4 18h.01'] },
  map: { paths: ['M9 4L3 6.5V20l6-2.5 6 2.5 6-2.5V4l-6 2.5L9 4z', 'M9 4v13.5M15 6.5V20'] },
  copy: { rects: [[8, 8, 12, 12, 2.5]], paths: ['M16 8V6.5A2.5 2.5 0 0 0 13.5 4h-7A2.5 2.5 0 0 0 4 6.5v7A2.5 2.5 0 0 0 6.5 16H8'] },
  print: { rects: [[4, 9, 16, 8, 2]], paths: ['M7 9V4h10v5', 'M7 14h10v6H7z'] },
  download: { paths: ['M12 4v11', 'M7.5 11l4.5 4.5 4.5-4.5', 'M5 20h14'] },
  upload: { paths: ['M12 16V5', 'M7.5 9L12 4.5 16.5 9', 'M5 20h14'] },
  share: { paths: ['M12 3v12', 'M7.5 7.5L12 3l4.5 4.5', 'M5 13v5.5A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5V13'] },
  circle: { circles: [[12, 12, 8.5]] },
  'circle-half': { circles: [[12, 12, 8.5]], solid: ['M12 3.5a8.5 8.5 0 0 1 0 17z'] },
  'circle-check': { circles: [[12, 12, 8.5]], paths: ['M8.3 12.4l2.5 2.5 4.9-5.2'] },
  alert: { paths: ['M12 4l9 16H3L12 4z', 'M12 10v4M12 17h.01'] },
  plus: { paths: ['M12 5v14M5 12h14'] },
  minus: { paths: ['M5 12h14'] },
  orient: { circles: [[12, 12, 7]], paths: ['M12 2v3M12 19v3M2 12h3M19 12h3', 'M12 9.5v5M9.5 12h5'] },
  bag: { rects: [[4, 8, 16, 12, 3]], paths: ['M9 8V6a3 3 0 0 1 6 0v2'] },
  external: { paths: ['M14 4h6v6', 'M20 4l-9 9', 'M18 14v4.5a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 4 18.5v-11A1.5 1.5 0 0 1 5.5 6H10'] },
  language: { paths: ['M4 6h9', 'M8.5 4v2', 'M6 6c.5 3 2.5 5.5 5.5 6.5', 'M11 6c-.5 3-3 6-6.5 7', 'M13 20l4-9 4 9', 'M14.5 17h5'] },
  search: { circles: [[11, 11, 6.5]], paths: ['M20 20l-4.35-4.35'] },
};

const props = defineProps({
  name: { type: String, required: true },
  size: { type: [Number, String], default: 20 },
  /** Mirror horizontally in right-to-left layouts (directional icons only). */
  flip: { type: Boolean, default: false },
});

const icon = computed(() => ICONS[props.name] || { paths: [] });
</script>
