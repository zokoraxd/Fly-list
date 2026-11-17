<template>
  <BaseDialog :open="open" labelled-by="destination-title" box-class="max-w-xl flex max-h-[90dvh] flex-col" @close="emit('close')">
    <template v-if="destination">
      <div class="relative h-36 w-full shrink-0 overflow-hidden bg-neutral text-neutral-content sm:h-44">
        <img v-if="tourist?.thumbnail" :src="tourist.thumbnail" :alt="displayName" class="size-full object-cover" loading="lazy" />
        <div v-if="tourist?.thumbnail" class="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-black/10" aria-hidden="true"></div>

        <button
          type="button"
          class="icon-btn absolute end-2 top-2 z-10 !bg-black/45 !text-white hover:!bg-black/70"
          :aria-label="t('a11y.closeDialog')"
          @click="emit('close')"
        >
          <AppIcon name="x" :size="18" />
        </button>

        <div class="absolute inset-x-4 bottom-3 flex items-end justify-between gap-3 text-white">
          <div class="min-w-0">
            <h3 id="destination-title" class="flex items-center gap-2 truncate text-2xl font-semibold">
              <span aria-hidden="true">{{ destination.flag }}</span>
              {{ displayName }}
            </h3>
            <p class="truncate text-sm text-white/85">{{ destination.admin1 ? destination.admin1 + ', ' : '' }}{{ destination.country }}</p>
          </div>

          <div v-if="current" class="sq-sm flex shrink-0 items-center gap-2 bg-base-100 px-3 py-1.5 text-base-content shadow-md">
            <span class="text-2xl" aria-hidden="true">{{ current.icon }}</span>
            <div>
              <div class="text-lg font-semibold leading-none tabular">{{ current.temperature }}°C</div>
              <div class="pt-0.5 text-xs text-base-content/70">{{ t(`weather.${current.conditionKey}`) }}</div>
            </div>
          </div>
        </div>
      </div>

      <div class="flex-1 space-y-5 overflow-y-auto p-4 sm:p-5">
        <div v-if="refreshing && !current" class="skeleton h-14 w-full" role="status" :aria-label="t('modal.loading')"></div>

        <dl v-if="current" class="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
          <div>
            <dt class="text-sm text-base-content/70">{{ t('modal.condition') }}</dt>
            <dd class="font-medium">{{ t(`weather.${current.conditionKey}`) }}</dd>
          </div>
          <div>
            <dt class="text-sm text-base-content/70">{{ t('modal.humidity') }}</dt>
            <dd class="font-medium tabular">{{ current.humidity ?? '–' }}%</dd>
          </div>
          <div>
            <dt class="text-sm text-base-content/70">{{ t('modal.wind') }}</dt>
            <dd class="font-medium tabular">{{ current.windSpeed ?? '–' }} km/h</dd>
          </div>
          <div>
            <dt class="text-sm text-base-content/70">{{ t('modal.timezone') }}</dt>
            <dd class="truncate font-medium" :title="destination.timezone || ''">{{ timezoneLabel }}</dd>
          </div>
        </dl>
        <p v-else-if="!refreshing" class="text-sm font-medium text-warning">{{ t('modal.weatherUnavailable') }}</p>

        <section v-if="tripDate" class="sq-md space-y-2 bg-accent/10 p-3" :aria-label="t('modal.tripDay')">
          <h4 class="flex items-center gap-2 text-sm font-semibold text-accent">
            <AppIcon name="calendar" :size="16" />
            {{ t('modal.tripDay') }}
          </h4>

          <div v-if="tripForecast" class="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
            <div class="text-sm text-base-content/80">
              {{ t('modal.tripDayHint', { date: formatDate(tripDate, { weekday: 'long', day: 'numeric', month: 'long' }) }) }}
            </div>
            <div class="flex items-center gap-2 font-medium tabular">
              <span class="text-xl" aria-hidden="true">{{ tripForecast.icon }}</span>
              <span>{{ t(`weather.${tripForecast.conditionKey}`) }}</span>
              <span>{{ tripForecast.max }}°</span>
              <span class="text-base-content/65">{{ tripForecast.min }}°</span>
              <span v-if="tripForecast.precipProb !== null" class="chip !bg-base-100">{{ t('modal.rainChance', { n: tripForecast.precipProb }) }}</span>
            </div>
          </div>

          <div v-else-if="tripInPast" class="text-sm text-base-content/75">{{ t('modal.pastTrip') }}</div>

          <div v-else>
            <div class="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
              <div class="text-sm text-base-content/80">{{ t('modal.typical', { date: formatDate(tripDate, { day: 'numeric', month: 'long' }) }) }}</div>
              <div v-if="typical" class="flex items-center gap-2 font-medium tabular">
                <span class="text-xl" aria-hidden="true">{{ typical.icon }}</span>
                <span>{{ t(`weather.${typical.conditionKey}`) }}</span>
                <span>{{ typical.max }}°</span>
                <span class="text-base-content/65">{{ typical.min }}°</span>
              </div>
              <span v-else-if="loadingClimate" class="skeleton h-6 w-32" role="status"></span>
              <span v-else class="text-sm text-base-content/65">–</span>
            </div>
            <p class="mt-1 text-sm text-base-content/70">{{ t('modal.typicalHint', { year: typical?.basedOnYear ?? lastYear, days: forecastDays }) }}</p>
          </div>
        </section>

        <section v-if="forecast.length" class="space-y-2" :aria-label="t('modal.forecast')">
          <h4 class="text-sm font-semibold">{{ t('modal.forecast') }}</h4>
          <ul class="grid grid-cols-4 gap-1.5 sm:grid-cols-7">
            <li
              v-for="day in forecast"
              :key="day.date"
              class="sq-sm flex flex-col items-center gap-0.5 px-1 py-2 text-center"
              :class="day.date === tripDate ? 'bg-accent/10 ring-1 ring-accent' : 'bg-base-200/70'"
            >
              <span class="text-xs text-base-content/75">{{ formatDate(day.date, { weekday: 'short' }) }}</span>
              <span class="text-xl" :title="t(`weather.${day.conditionKey}`)" aria-hidden="true">{{ day.icon }}</span>
              <span class="sr-only">{{ t(`weather.${day.conditionKey}`) }}</span>
              <span class="text-sm tabular">
                <span class="font-semibold">{{ day.max }}°</span>
                <span class="ms-1 text-base-content/65">{{ day.min }}°</span>
              </span>
            </li>
          </ul>
        </section>

        <section class="space-y-2" :aria-label="t('modal.tourist')">
          <div class="flex items-center justify-between gap-2">
            <h4 class="text-sm font-semibold">{{ t('modal.tourist') }}</h4>
            <a
              v-if="tourist?.pageUrl"
              :href="tourist.pageUrl"
              target="_blank"
              rel="noopener noreferrer"
              class="inline-flex min-h-9 items-center gap-1 text-sm font-medium text-primary hover:underline"
            >
              {{ t('modal.fullGuide') }}
              <AppIcon name="external" :size="14" flip />
            </a>
          </div>
          <div class="text-sm leading-relaxed" :dir="tourist?.lang === 'ar' ? 'rtl' : 'ltr'">
            <template v-if="tourist">
              <p v-if="tourist.description" class="mb-1 font-medium">{{ tourist.description }}</p>
              <p class="max-w-prose text-base-content/85">{{ tourist.extract }}</p>
            </template>
            <p v-else class="text-base-content/70">{{ t('modal.noGuide') }}</p>
          </div>
        </section>
      </div>

      <div class="flex shrink-0 items-center justify-between gap-3 bg-base-200/60 px-4 py-2.5 sm:px-5">
        <span class="truncate text-xs text-base-content/70">
          {{ t('modal.source')
          }}<template v-if="destination.weather?.fetchedAt"> · {{ t('modal.updated', { time: formatTime(destination.weather.fetchedAt) }) }}</template>
        </span>
        <div class="flex shrink-0 items-center gap-1">
          <button
            type="button"
            class="btn btn-ghost sq-sm min-h-11 gap-1.5 px-3 sm:min-h-9"
            :disabled="refreshing"
            @click="refreshDestination(destination.key, { force: true })"
          >
            <span v-if="refreshing" class="loading loading-spinner loading-xs" aria-hidden="true"></span>
            <AppIcon v-else name="refresh" :size="16" />
            {{ t('modal.refresh') }}
          </button>
          <button type="button" class="btn btn-primary sq-sm min-h-11 px-5 sm:min-h-9" @click="emit('close')">{{ t('modal.close') }}</button>
        </div>
      </div>
    </template>

    <div v-else class="space-y-4 p-8 text-center">
      <p class="font-medium text-error">{{ t('modal.error') }}</p>
      <button type="button" class="btn btn-outline btn-sm" @click="emit('close')">{{ t('modal.close') }}</button>
    </div>
  </BaseDialog>
</template>

<script setup>
import { computed, watch } from 'vue';
import AppIcon from './AppIcon.vue';
import BaseDialog from './BaseDialog.vue';
import { useTasks } from '../composables/useTasks.js';
import { useI18n } from '../i18n/index.js';
import { FORECAST_DAYS, getForecastForDate } from '../services/travelApi.js';
import { daysUntil } from '../utils/dateParser.js';
import { localizedName } from '../utils/placeName.js';

const props = defineProps({
  open: { type: Boolean, default: false },
  destinationKey: { type: String, default: null },
  tripDate: { type: String, default: null },
});

const emit = defineEmits(['close']);

const { t, locale, formatDate, formatTime } = useI18n();
const { destinations, refreshDestination, loadTourist, loadTypicalWeather, isRefreshing, isLoadingClimate } = useTasks();

const forecastDays = FORECAST_DAYS;
const lastYear = new Date().getFullYear() - 1;

const destination = computed(() => (props.destinationKey ? destinations.value[props.destinationKey] || null : null));
const displayName = computed(() => localizedName(destination.value, locale.value));
const current = computed(() => {
  const c = destination.value?.weather?.current;
  return c && c.temperature !== null ? c : null;
});
const forecast = computed(() => destination.value?.weather?.daily?.slice(0, 7) || []);
const tourist = computed(() => {
  const info = destination.value?.tourist;
  if (!info) return null;
  return info[locale.value] || info.en || Object.values(info)[0] || null;
});
const refreshing = computed(() => (destination.value ? isRefreshing(destination.value.key) : false));

const tripDaysAway = computed(() => (props.tripDate ? daysUntil(props.tripDate) : null));
const tripInPast = computed(() => tripDaysAway.value !== null && tripDaysAway.value < 0);
const tripForecast = computed(() => getForecastForDate(destination.value?.weather, props.tripDate));
const typical = computed(() => (props.tripDate ? destination.value?.climate?.[props.tripDate] || null : null));
const loadingClimate = computed(() => (destination.value && props.tripDate ? isLoadingClimate(destination.value.key, props.tripDate) : false));

const timezoneLabel = computed(() => {
  const tz = destination.value?.timezone;
  if (!tz) return '–';
  return tz.split('/').pop().replace(/_/g, ' ');
});

watch(
  () => [props.open, props.destinationKey, props.tripDate, locale.value],
  () => {
    if (!props.open || !destination.value) return;
    const key = destination.value.key;
    refreshDestination(key);
    if (!destination.value.tourist[locale.value]) loadTourist(key);
    if (props.tripDate && !tripInPast.value && !getForecastForDate(destination.value.weather, props.tripDate) && tripDaysAway.value >= FORECAST_DAYS) {
      loadTypicalWeather(key, props.tripDate);
    }
  },
  { immediate: true },
);

// When fresh weather arrives and the trip is still beyond the horizon, fetch the climate record.
watch(
  () => destination.value?.weather?.fetchedAt,
  () => {
    if (!props.open || !destination.value || !props.tripDate || tripInPast.value) return;
    if (!getForecastForDate(destination.value.weather, props.tripDate) && tripDaysAway.value >= FORECAST_DAYS) {
      loadTypicalWeather(destination.value.key, props.tripDate);
    }
  },
);
</script>
