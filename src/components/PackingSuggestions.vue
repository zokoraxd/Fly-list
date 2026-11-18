<template>
  <details v-if="suggestions.length > 0" class="surface sq-lg group" :open="isOpen" @toggle="isOpen = $event.target.open">
    <summary
      class="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 rounded-[inherit] px-4 py-3 text-sm font-semibold focus-visible:ring-2 focus-visible:ring-primary [&::-webkit-details-marker]:hidden"
    >
      <span class="flex items-center gap-2">
        <AppIcon name="bag" :size="18" class="text-primary" />
        {{ t('packing.summary', { count: suggestions.length }) }}
      </span>
      <AppIcon name="chevron" :size="18" class="text-base-content/60 transition-transform group-open:rotate-180" />
    </summary>

    <ul class="space-y-1 px-2 pb-2">
      <li v-for="suggestion in suggestions" :key="suggestion.id" class="sq-md flex animate-fade-in items-start gap-3 p-2 ps-3">
        <span class="pt-0.5 text-lg" aria-hidden="true">{{ suggestion.icon }}</span>
        <div class="min-w-0 flex-1">
          <p class="text-sm font-medium leading-snug">{{ text(suggestion) }}</p>
          <p class="mt-0.5 text-xs tabular text-base-content/70">
            {{ t('packing.context', { name: suggestion.name, temp: suggestion.temp ?? '–', condition: t(`weather.${suggestion.conditionKey}`) }) }}
            · {{ suggestion.date ? t('packing.onDate', { date: formatDate(suggestion.date) }) : t('packing.now') }}
          </p>
          <div class="-ms-3 mt-1 flex items-center">
            <button type="button" class="icon-btn !w-auto gap-1 px-3 text-sm font-medium !text-primary" @click="add(suggestion)">
              <AppIcon name="plus" :size="16" />
              {{ t('packing.add') }}
            </button>
            <button type="button" class="icon-btn" :aria-label="t('packing.dismiss')" :title="t('packing.dismiss')" @click="dismissSuggestion(suggestion.id)">
              <AppIcon name="x" :size="16" />
            </button>
          </div>
        </div>
      </li>
    </ul>
  </details>
</template>

<script setup>
import { computed, ref } from 'vue';
import AppIcon from './AppIcon.vue';
import { useTasks } from '../composables/useTasks.js';
import { useI18n } from '../i18n/index.js';
import { computePackingSuggestions } from '../utils/packing.js';

const MAX_VISIBLE = 3;

const { t, formatDate } = useI18n();
const { state, tasks, destinations, todayIso, addTask, dismissSuggestion } = useTasks();

// Open on wide screens where the side panel has room; collapsed on phones so the list stays in view.
const isOpen = ref(typeof window !== 'undefined' && window.matchMedia?.('(min-width: 768px)').matches);

const suggestions = computed(() =>
  computePackingSuggestions(tasks.value, destinations.value, {
    dismissed: state.dismissedSuggestions,
    today: todayIso(),
  }).slice(0, MAX_VISIBLE),
);

function text(suggestion) {
  return t(`packing.${suggestion.type}`, { name: suggestion.name });
}

function add(suggestion) {
  addTask(text(suggestion), { skipDetection: true, skipDateParsing: true, dueDate: suggestion.date, destinationKey: suggestion.destinationKey });
  dismissSuggestion(suggestion.id);
}
</script>
