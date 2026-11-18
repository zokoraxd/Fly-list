<template>
  <section class="surface sq-lg overflow-hidden transition-colors" :class="task || destination ? 'border-accent/55' : ''" :aria-label="t('detail.heading')">
    <header class="flex items-center justify-between gap-2 border-b border-base-300/60 px-4 py-2.5">
      <h2 class="text-sm font-semibold text-accent">{{ t('detail.heading') }}</h2>
      <button
        v-if="task"
        type="button"
        class="inline-flex min-h-8 items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        :class="
          task.status === 'completed'
            ? 'bg-success/15 text-success hover:bg-success/25'
            : 'bg-base-200 text-base-content/85 hover:bg-primary/15 hover:text-primary'
        "
        @click="toggleCompleted"
      >
        <AppIcon name="check" :size="14" />
        {{ task.status === 'completed' ? t('detail.reopen') : t('detail.markCompleted') }}
      </button>
    </header>

    <div v-if="!task && !destination" class="flex items-center gap-3.5 p-4 text-sm">
      <span class="sq-md flex size-11 shrink-0 items-center justify-center bg-primary/15 text-primary">
        <AppIcon name="globe" :size="22" />
      </span>
      <div class="min-w-0">
        <p class="font-medium text-base-content">{{ t('detail.emptyTitle') }}</p>
        <p class="mt-1 text-xs leading-relaxed text-base-content/75">{{ t('detail.emptyHint') }}</p>
      </div>
    </div>

    <div v-else class="space-y-3.5 p-4">
      <div class="flex flex-col gap-3.5 sm:flex-row">
        <div class="sq-md relative h-28 w-full shrink-0 overflow-hidden bg-neutral text-neutral-content sm:w-28">
          <img v-if="tourist?.thumbnail" :src="tourist.thumbnail" :alt="displayName || task?.title" class="size-full object-cover" loading="lazy" />
          <div
            v-else
            class="flex size-full flex-col items-center justify-center gap-1.5 bg-gradient-to-br rtl:bg-gradient-to-bl from-primary/25 to-base-300/60 p-2 text-center"
          >
            <span v-if="destination" class="text-3xl leading-none" aria-hidden="true">{{ destination.flag }}</span>
            <AppIcon v-else name="list" :size="26" class="text-primary" />
            <span v-if="displayName" class="max-w-full truncate text-xs font-medium text-base-content/90">{{ displayName }}</span>
          </div>
        </div>

        <div class="min-w-0 flex-1 space-y-2">
          <div>
            <h3 class="truncate text-base font-semibold text-base-content">{{ task ? task.title : displayName }}</h3>
            <p v-if="tourist?.extract" class="mt-1 line-clamp-2 text-xs leading-relaxed text-base-content/80" :dir="tourist.lang === 'ar' ? 'rtl' : 'ltr'">
              {{ tourist.extract }}
            </p>
            <p v-else-if="tourist?.description" class="mt-1 line-clamp-2 text-xs text-base-content/80">{{ tourist.description }}</p>
            <div v-else-if="destination && !tourist" class="mt-2 space-y-1.5" aria-hidden="true">
              <span class="skeleton block h-2.5 w-full"></span>
              <span class="skeleton block h-2.5 w-3/4"></span>
            </div>
          </div>

          <div class="flex flex-wrap items-center gap-1.5 text-xs">
            <button
              v-if="destination"
              type="button"
              class="chip !bg-primary/15 !text-primary transition-colors hover:!bg-primary/25 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              @click="emit('focus-globe', destination.key)"
            >
              <span aria-hidden="true">{{ destination.flag }}</span>
              <span>{{ displayName }}</span>
            </button>
            <span v-else class="chip">{{ t('detail.generalTask') }}</span>

            <span v-if="task" class="chip" :class="statusChipClass">{{ statusLabel }}</span>

            <span v-if="current" class="chip tabular !bg-primary/15 !text-primary">
              <span aria-hidden="true">{{ current.icon }}</span>
              <bdi dir="ltr">{{ current.temperature }}°C</bdi>
            </span>

            <span v-if="task?.dueDate" class="chip tabular !bg-accent/15 !text-accent">
              <AppIcon name="calendar" :size="12" />
              {{ formatDate(task.dueDate, { day: 'numeric', month: 'short' }) }}
            </span>
          </div>
        </div>
      </div>

      <!-- Forecast highlight: brings trip-day weather & 5-day forecast front and center -->
      <div v-if="destination && (tripForecast || typical || miniForecast.length)" class="sq-md space-y-2.5 border border-primary/25 bg-primary/5 p-3">
        <div v-if="tripDate && (tripForecast || typical)" class="flex flex-wrap items-center justify-between gap-2 text-xs">
          <span class="flex items-center gap-1.5 font-semibold text-primary">
            <AppIcon name="calendar" :size="14" />
            {{
              tripForecast
                ? t('modal.tripDayHint', { date: formatDate(tripDate, { weekday: 'short', day: 'numeric', month: 'short' }) })
                : t('modal.typical', { date: formatDate(tripDate, { day: 'numeric', month: 'short' }) })
            }}
          </span>
          <span class="flex items-center gap-1.5 font-semibold tabular">
            <span aria-hidden="true">{{ (tripForecast || typical).icon }}</span>
            <bdi dir="ltr">{{ (tripForecast || typical).max }}° / {{ (tripForecast || typical).min }}°</bdi>
            <span v-if="tripForecast?.precipProb !== null && tripForecast?.precipProb !== undefined" class="chip !bg-base-100/85 !py-0.5 text-xs">
              {{ t('modal.rainChance', { n: tripForecast.precipProb }) }}
            </span>
          </span>
        </div>

        <ul v-if="miniForecast.length" class="grid grid-cols-5 gap-1.5">
          <li
            v-for="day in miniForecast"
            :key="day.date"
            class="sq-sm flex flex-col items-center gap-1 px-1 py-2 text-center"
            :class="day.date === tripDate ? 'bg-accent/15 ring-1 ring-accent' : 'bg-base-100/75'"
          >
            <span class="text-xs font-medium text-base-content/80">{{ formatDate(day.date, { weekday: 'short' }) }}</span>
            <span class="text-lg leading-none" :title="t(`weather.${day.conditionKey}`)" aria-hidden="true">{{ day.icon }}</span>
            <span class="text-xs tabular">
              <bdi dir="ltr">
                <span class="font-semibold">{{ day.max }}°</span>
                <span class="ms-0.5 text-base-content/70">{{ day.min }}°</span>
              </bdi>
            </span>
          </li>
        </ul>
      </div>

      <div class="flex items-center gap-2">
        <button
          v-if="destination"
          type="button"
          class="btn btn-primary btn-sm sq-sm min-h-10 flex-1 gap-2 text-sm font-semibold"
          @click="emit('open-destination', destination.key)"
        >
          <AppIcon name="external" :size="15" flip />
          {{ t('detail.fullForecast') }}
        </button>
        <button
          v-else-if="task"
          type="button"
          class="btn btn-sm sq-sm min-h-10 flex-1 gap-1.5 text-sm font-semibold"
          :class="task.status === 'completed' ? 'btn-outline btn-success' : 'btn-primary'"
          @click="toggleCompleted"
        >
          <AppIcon name="check" :size="15" />
          {{ task.status === 'completed' ? t('detail.reopen') : t('detail.markCompleted') }}
        </button>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed, watch } from 'vue';
import AppIcon from './AppIcon.vue';
import { useTasks } from '../composables/useTasks.js';
import { useI18n } from '../i18n/index.js';
import { FORECAST_DAYS, getForecastForDate } from '../services/travelApi.js';
import { daysUntil } from '../utils/dateParser.js';
import { localizedName } from '../utils/placeName.js';

const props = defineProps({
  task: { type: Object, default: null },
  destination: { type: Object, default: null },
});

const emit = defineEmits(['open-destination', 'focus-globe']);

const { t, locale, formatDate } = useI18n();
const { setStatus, loadTourist, loadTypicalWeather } = useTasks();

const displayName = computed(() => localizedName(props.destination, locale.value));
const tourist = computed(() => props.destination?.tourist?.[locale.value] || props.destination?.tourist?.en || null);
const current = computed(() => {
  const c = props.destination?.weather?.current;
  return c && c.temperature !== null ? c : null;
});
const miniForecast = computed(() => props.destination?.weather?.daily?.slice(0, 5) || []);

const tripDate = computed(() => props.task?.dueDate || null);
const tripDaysAway = computed(() => (tripDate.value ? daysUntil(tripDate.value) : null));
const tripInPast = computed(() => tripDaysAway.value !== null && tripDaysAway.value < 0);
const tripForecast = computed(() => getForecastForDate(props.destination?.weather, tripDate.value));
const typical = computed(() => (tripDate.value ? props.destination?.climate?.[tripDate.value] || null : null));

const statusLabel = computed(() => {
  if (!props.task) return '';
  if (props.task.status === 'completed') return t('status.completed');
  if (props.task.status === 'in-progress') return t('status.inProgress');
  return t('status.planned');
});

const statusChipClass = computed(() => {
  if (!props.task) return '';
  if (props.task.status === 'completed') return '!bg-success/15 !text-success';
  if (props.task.status === 'in-progress') return '!bg-warning/15 !text-warning';
  return '!bg-base-200 text-base-content/85';
});

watch(
  () => [props.destination?.key, tripDate.value, locale.value],
  ([key, date]) => {
    if (!key) return;
    if (!props.destination?.tourist?.[locale.value]) {
      loadTourist(key);
    }
    if (date && !tripInPast.value && !getForecastForDate(props.destination?.weather, date) && tripDaysAway.value >= FORECAST_DAYS) {
      loadTypicalWeather(key, date);
    }
  },
  { immediate: true },
);

function toggleCompleted() {
  if (!props.task) return;
  setStatus(props.task.id, props.task.status === 'completed' ? 'planned' : 'completed');
}
</script>
