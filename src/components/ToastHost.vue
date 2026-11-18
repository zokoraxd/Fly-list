<template>
  <div class="toast toast-bottom toast-end pointer-events-none z-[60] w-full max-w-sm px-4 pb-2" aria-live="polite" aria-atomic="false">
    <TransitionGroup name="toast">
      <div
        v-for="toast in toasts"
        :key="toast.id"
        class="alert sq-md pointer-events-auto flex items-center justify-between gap-3 px-4 py-2 text-sm shadow-lg"
        :class="variantClass(toast.variant)"
        role="status"
      >
        <span class="flex-1 text-start">{{ toast.message }}</span>
        <div class="flex shrink-0 items-center">
          <button v-if="toast.action" type="button" class="icon-btn !w-auto px-3 text-sm font-semibold hover:!bg-black/10" @click="runAction(toast)">
            {{ toast.action.label }}
          </button>
          <button type="button" class="icon-btn hover:!bg-black/10" :aria-label="t('a11y.closeDialog')" @click="dismiss(toast.id)">
            <AppIcon name="x" :size="16" />
          </button>
        </div>
      </div>
    </TransitionGroup>
  </div>
</template>

<script setup>
import AppIcon from './AppIcon.vue';
import { useToast } from '../composables/useToast.js';
import { useI18n } from '../i18n/index.js';

const { toasts, dismiss } = useToast();
const { t } = useI18n();

function variantClass(variant) {
  switch (variant) {
    case 'success':
      return 'alert-success';
    case 'error':
      return 'alert-error';
    case 'warning':
      return 'alert-warning';
    default:
      return 'border border-base-300 bg-neutral text-neutral-content';
  }
}

function runAction(toast) {
  try {
    toast.action?.handler();
  } finally {
    dismiss(toast.id);
  }
}
</script>

<style scoped>
.toast-enter-active,
.toast-leave-active {
  transition:
    opacity 0.2s cubic-bezier(0.23, 1, 0.32, 1),
    transform 0.2s cubic-bezier(0.23, 1, 0.32, 1);
}
.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateY(12px);
}
</style>
