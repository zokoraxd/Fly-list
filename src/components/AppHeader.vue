<template>
  <header class="flex items-center justify-between gap-3">
    <div class="flex min-w-0 items-center gap-3">
      <span class="sq-md flex size-10 shrink-0 items-center justify-center bg-primary text-primary-content" aria-hidden="true">
        <AppIcon name="plane" :size="20" flip />
      </span>
      <h1 class="truncate text-xl font-semibold text-base-content">{{ t('app.name') }}</h1>
    </div>

    <div class="flex items-center gap-1">
      <button type="button" class="icon-btn gap-2 sm:w-auto sm:px-3" :aria-label="t('header.export')" :title="t('header.export')" @click="emit('open-export')">
        <AppIcon name="share" :size="18" />
        <span class="hidden text-sm font-medium sm:inline">{{ t('header.export') }}</span>
      </button>
      <button type="button" class="icon-btn" :aria-label="t('header.theme')" :title="t('header.theme')" @click="toggleTheme">
        <AppIcon :name="isDark ? 'sun' : 'moon'" :size="18" />
      </button>
      <button
        type="button"
        class="icon-btn w-auto px-3 text-sm font-medium"
        :aria-label="t('header.language')"
        :title="t('header.language')"
        @click="toggleLocale"
      >
        {{ locale === 'en' ? 'عربي' : 'EN' }}
      </button>
    </div>
  </header>
</template>

<script setup>
import AppIcon from './AppIcon.vue';
import { useTheme } from '../composables/useTheme.js';
import { useI18n } from '../i18n/index.js';

const emit = defineEmits(['open-export']);

const { t, locale, toggleLocale } = useI18n();
const { isDark, toggleTheme } = useTheme();
</script>
