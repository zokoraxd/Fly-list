<template>
  <section aria-labelledby="smart-input-label">
    <label id="smart-input-label" for="smart-input" class="sr-only">{{ t('input.placeholder') }}</label>
    <form
      class="surface sq-lg flex items-center gap-2 p-2 ps-3.5 shadow-sm transition-colors focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/40"
      :class="{ '!border-error focus-within:!ring-error/40': hasError }"
      @submit.prevent="submit"
    >
      <AppIcon name="search" :size="18" class="shrink-0 text-base-content/65" />
      <input
        id="smart-input"
        v-model="title"
        type="text"
        dir="auto"
        autocomplete="off"
        enterkeyhint="done"
        :autocorrect="locale === 'ar' ? 'off' : 'on'"
        :spellcheck="locale !== 'ar'"
        :autocapitalize="locale === 'ar' ? 'off' : 'sentences'"
        :placeholder="t('input.placeholder')"
        class="min-w-0 flex-1 bg-transparent py-2 text-[15px] text-base-content placeholder:text-base-content/65 focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
        :aria-invalid="hasError"
        :aria-describedby="hasError ? 'smart-input-error' : 'smart-input-hint'"
        @input="hasError = false"
      />
      <button
        v-if="preview.place"
        type="button"
        class="btn btn-ghost sq-sm min-h-10 shrink-0 px-3 text-xs font-semibold text-primary sm:min-h-9"
        @click="focusPlace"
      >
        <AppIcon name="globe" :size="15" />
        <span class="hidden sm:inline">{{ t('input.loadPlace') }}</span>
      </button>
      <button type="submit" class="btn btn-primary sq-sm min-h-10 shrink-0 px-4 text-sm font-semibold sm:min-h-9">
        {{ t('input.add') }}
      </button>
    </form>

    <div class="mt-2 min-h-7 px-1 text-xs leading-relaxed" aria-live="polite">
      <p v-if="hasError" id="smart-input-error" class="font-medium text-error" role="alert">{{ t('input.emptyError') }}</p>
      <div v-else-if="preview.place || preview.date" id="smart-input-hint" class="flex animate-fade-in flex-wrap items-center gap-2">
        <button
          v-if="preview.place"
          type="button"
          class="chip !bg-primary/15 !text-primary transition-colors hover:!bg-primary/25"
          :title="t('input.detected', { name: preview.place.name, country: preview.place.country })"
          @click="focusPlace"
        >
          <AppIcon name="pin" :size="14" />
          <span aria-hidden="true">{{ preview.place.flag }}</span>
          <span>{{ preview.place.name }}</span>
          <span class="font-normal opacity-80">, {{ preview.place.country }}</span>
        </button>
        <span v-if="preview.date" class="chip tabular !bg-accent/15 !text-accent">
          <AppIcon name="calendar" :size="14" />
          {{ formatDate(preview.date.date, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) }}
        </span>
      </div>
      <p v-else id="smart-input-hint" class="text-base-content/75">{{ t('input.tip') }}</p>
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

const emit = defineEmits(['added', 'focus-place']);

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
  const task = addTask(text);
  title.value = '';
  hasError.value = false;
  if (task) emit('added', task);
}

function focusPlace() {
  if (!preview.value.place) return;
  emit('focus-place', preview.value.place);
}
</script>
