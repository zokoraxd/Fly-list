<template>
  <section aria-labelledby="smart-input-label">
    <label id="smart-input-label" for="smart-input" class="sr-only">{{ t('input.placeholder') }}</label>
    <form
      class="surface sq-lg flex items-center gap-2 p-2 ps-4 shadow-sm transition-shadow focus-within:border-primary focus-within:shadow-md"
      :class="{ '!border-error': hasError }"
      @submit.prevent="submit"
    >
      <input
        id="smart-input"
        v-model="title"
        type="text"
        autocomplete="off"
        enterkeyhint="done"
        :autocorrect="locale === 'ar' ? 'off' : 'on'"
        :spellcheck="locale !== 'ar'"
        :autocapitalize="locale === 'ar' ? 'off' : 'sentences'"
        :placeholder="t('input.placeholder')"
        class="min-w-0 flex-1 bg-transparent py-2 text-base placeholder:text-base-content/55 focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
        :aria-invalid="hasError"
        :aria-describedby="hasError ? 'smart-input-error' : 'smart-input-hint'"
        @input="hasError = false"
      />
      <button type="submit" class="btn btn-primary sq-sm min-h-11 px-5 font-medium">
        {{ t('input.add') }}
      </button>
    </form>

    <div class="mt-2 min-h-8 px-1 text-sm" aria-live="polite">
      <p v-if="hasError" id="smart-input-error" class="font-medium text-error" role="alert">{{ t('input.emptyError') }}</p>
      <div v-else-if="preview.place || preview.date" id="smart-input-hint" class="flex animate-fade-in flex-wrap items-center gap-2">
        <span
          v-if="preview.place"
          class="chip !bg-primary/10 !text-primary"
          :title="t('input.detected', { name: preview.place.name, country: preview.place.country })"
        >
          <AppIcon name="pin" :size="14" />
          <span aria-hidden="true">{{ preview.place.flag }}</span>
          {{ preview.place.name }}<span class="font-normal opacity-70">, {{ preview.place.country }}</span>
        </span>
        <span v-if="preview.date" class="chip tabular !bg-accent/10 !text-accent">
          <AppIcon name="calendar" :size="14" />
          {{ formatDate(preview.date.date, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) }}
        </span>
      </div>
      <p v-else id="smart-input-hint" class="text-base-content/65">{{ t('input.tip') }}</p>
    </div>
  </section>
</template>

<script setup>
import { computed, ref } from 'vue';
import AppIcon from './AppIcon.vue';
import { extractPlaceFromText } from '../data/places.js';
import { parseDateFromText } from '../utils/dateParser.js';
import { useTasks } from '../composables/useTasks.js';
import { useI18n } from '../i18n/index.js';

const { t, locale, formatDate } = useI18n();
const { addTask } = useTasks();

const title = ref('');
const hasError = ref(false);

const preview = computed(() => {
  const text = title.value.trim();
  if (!text) return { place: null, date: null };
  return {
    place: extractPlaceFromText(text),
    date: parseDateFromText(text, { locale: locale.value }),
  };
});

function submit() {
  const text = title.value.trim();
  if (!text) {
    hasError.value = true;
    return;
  }
  addTask(text);
  title.value = '';
  hasError.value = false;
}
</script>
