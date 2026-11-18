<template>
  <section class="surface sq-lg p-4" :class="trip ? '' : 'hidden md:block'" :aria-label="t('nextTrip.title')">
    <h2 class="mb-3 text-sm font-semibold text-base-content/80">{{ t('nextTrip.title') }}</h2>

    <button
      v-if="trip"
      type="button"
      class="sq-md -m-2 flex w-[calc(100%+1rem)] flex-col gap-3 p-2.5 text-start transition-colors hover:bg-base-200 focus-visible:ring-2 focus-visible:ring-primary"
      :aria-label="t('nextTrip.open', { name: tripName })"
      @click="emit('open-destination', trip.destination.key)"
    >
      <span class="flex items-start justify-between gap-3">
        <span class="min-w-0">
          <span class="block truncate text-lg font-semibold">
            <span aria-hidden="true">{{ trip.destination.flag }}</span> {{ tripName }}
          </span>
          <span class="block truncate text-sm text-base-content/70 tabular">{{ dateText }}</span>
        </span>
        <span class="text-end">
          <span class="block text-2xl font-semibold leading-none text-accent tabular">{{ countdown.value }}</span>
          <span v-if="countdown.label" class="block pt-1 text-xs text-base-content/70">{{ countdown.label }}</span>
        </span>
      </span>

      <span v-if="weatherLine" class="flex items-center gap-2 text-sm tabular">
        <span aria-hidden="true" class="text-lg">{{ weatherLine.icon }}</span>
        <span>{{ weatherLine.label }}</span>
        <!-- Numbers stay left-to-right inside Arabic text, otherwise "12° / 5°" comes out reversed. -->
        <bdi dir="ltr">{{ weatherLine.temps }}</bdi>
      </span>

      <svg class="hidden h-2 w-full text-accent md:block" aria-hidden="true">
        <line x1="2" y1="4" x2="100%" y2="4" stroke="currentColor" stroke-width="2" stroke-dasharray="2 7" stroke-linecap="round" />
      </svg>
    </button>

    <p v-else class="text-sm leading-relaxed text-base-content/70">{{ t('nextTrip.empty') }}</p>
  </section>
</template>

<script setup>
import { computed } from 'vue';
import { useTasks } from '../composables/useTasks.js';
import { useI18n } from '../i18n/index.js';
import { getForecastForDate } from '../services/travelApi.js';
import { daysUntil } from '../utils/dateParser.js';
import { localizedName } from '../utils/placeName.js';

const emit = defineEmits(['open-destination']);

const { t, locale, formatDate } = useI18n();
const { tasks, destinations } = useTasks();

/** Soonest not-yet-completed task that has both a date (today or later) and a destination. */
const trip = computed(() => {
  let best = null;
  for (const task of tasks.value) {
    if (task.status === 'completed' || !task.dueDate || !task.destinationKey) continue;
    const destination = destinations.value[task.destinationKey];
    if (!destination) continue;
    const days = daysUntil(task.dueDate);
    if (days === null || days < 0) continue;
    if (!best || days < best.days) best = { task, destination, days };
  }
  return best;
});

const tripName = computed(() => localizedName(trip.value?.destination, locale.value));

const countdown = computed(() => {
  const days = trip.value?.days ?? 0;
  if (days === 0) return { value: t('dates.today'), label: '' };
  if (days === 1) return { value: t('dates.tomorrow'), label: '' };
  return { value: String(days), label: t('nextTrip.daysLeft') };
});

const dateText = computed(() => (trip.value ? formatDate(trip.value.task.dueDate, { weekday: 'long', day: 'numeric', month: 'long' }) : ''));

const weatherLine = computed(() => {
  if (!trip.value) return null;
  const weather = trip.value.destination.weather;
  const forecast = getForecastForDate(weather, trip.value.task.dueDate);
  if (forecast) return { icon: forecast.icon, label: t(`weather.${forecast.conditionKey}`), temps: `${forecast.max}° / ${forecast.min}°` };
  const current = weather?.current;
  if (current && current.temperature !== null) return { icon: current.icon, label: t(`weather.${current.conditionKey}`), temps: `${current.temperature}°C` };
  return null;
});
</script>
