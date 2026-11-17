<template>
  <BaseDialog :open="open" labelled-by="export-title" box-class="max-w-lg" @close="emit('close')">
    <div class="space-y-4 p-5">
      <div class="flex items-center justify-between">
        <h3 id="export-title" class="text-lg font-semibold">{{ t('export.title') }}</h3>
        <button type="button" class="icon-btn" :aria-label="t('a11y.closeDialog')" @click="emit('close')">
          <AppIcon name="x" :size="18" />
        </button>
      </div>

      <p class="text-sm text-base-content/75">{{ t('export.description') }}</p>

      <label class="sr-only" for="export-preview">Markdown</label>
      <textarea
        id="export-preview"
        :value="markdown"
        readonly
        rows="9"
        dir="auto"
        class="textarea textarea-bordered sq-md w-full resize-none bg-base-200/60 p-3 font-mono text-xs leading-relaxed focus:outline-none"
        @focus="$event.target.select()"
      ></textarea>

      <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <span class="text-sm text-base-content/70 tabular">{{ t('export.summary', { tasks: tasks.length, destinations: destinationList.length }) }}</span>
        <div class="flex flex-wrap gap-2 sm:justify-end">
          <button type="button" class="btn btn-ghost sq-sm min-h-11 gap-1.5 px-3 sm:min-h-9" @click="printItinerary">
            <AppIcon name="print" :size="16" />
            {{ t('export.print') }}
          </button>
          <button type="button" class="btn btn-ghost sq-sm min-h-11 gap-1.5 px-3 sm:min-h-9" @click="downloadMarkdown">
            <AppIcon name="download" :size="16" />
            {{ t('export.download') }}
          </button>
          <button type="button" class="btn btn-primary sq-sm min-h-11 gap-1.5 px-4 sm:min-h-9" @click="copyMarkdown">
            <AppIcon name="copy" :size="16" />
            {{ t('export.copy') }}
          </button>
        </div>
      </div>

      <div class="sq-md flex flex-wrap items-center justify-between gap-2 bg-base-200/60 p-2 ps-4">
        <span class="text-sm font-medium text-base-content/75">JSON</span>
        <div class="flex gap-1">
          <button type="button" class="btn btn-ghost sq-sm min-h-11 gap-1.5 px-3 sm:min-h-9" @click="downloadBackup">
            <AppIcon name="download" :size="16" />
            {{ t('export.backup') }}
          </button>
          <button type="button" class="btn btn-ghost sq-sm min-h-11 gap-1.5 px-3 sm:min-h-9" @click="fileInput?.click()">
            <AppIcon name="upload" :size="16" />
            {{ t('export.restore') }}
          </button>
          <input ref="fileInput" type="file" accept="application/json,.json" class="hidden" @change="restoreBackup" />
        </div>
      </div>
    </div>
  </BaseDialog>
</template>

<script setup>
import { computed, ref } from 'vue';
import AppIcon from './AppIcon.vue';
import BaseDialog from './BaseDialog.vue';
import { useTasks } from '../composables/useTasks.js';
import { useToast } from '../composables/useToast.js';
import { useI18n } from '../i18n/index.js';
import { buildBackup, buildMarkdown, buildPrintHtml, downloadTextFile, parseBackup } from '../utils/exportUtils.js';

defineProps({
  open: { type: Boolean, default: false },
});

const emit = defineEmits(['close']);

const { t, locale, formatDate } = useI18n();
const toast = useToast();
const { state, tasks, destinations, destinationList, replaceState } = useTasks();

const fileInput = ref(null);

const ctx = computed(() => ({ t, formatDate, locale: locale.value }));
const markdown = computed(() => buildMarkdown(tasks.value, destinations.value, ctx.value));

function stamp() {
  return new Date().toISOString().slice(0, 10);
}

async function copyMarkdown() {
  try {
    await navigator.clipboard.writeText(markdown.value);
    toast.success(t('export.copied'));
  } catch {
    toast.error(t('export.copyFailed'));
  }
}

function downloadMarkdown() {
  downloadTextFile(`fly-list-itinerary-${stamp()}.md`, markdown.value, 'text/markdown');
}

function printItinerary() {
  const printWindow = window.open('', '_blank', 'noopener=no');
  if (!printWindow) return;
  printWindow.document.open();
  printWindow.document.write(buildPrintHtml(tasks.value, destinations.value, ctx.value));
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => printWindow.print(), 300);
}

function downloadBackup() {
  downloadTextFile(`fly-list-backup-${stamp()}.json`, buildBackup(state), 'application/json');
}

async function restoreBackup(event) {
  const file = event.target.files?.[0];
  event.target.value = '';
  if (!file) return;

  try {
    const next = parseBackup(await file.text());
    if (tasks.value.length > 0 && !window.confirm(t('export.restoreConfirm'))) return;
    replaceState(next);
    toast.success(t('export.restored'));
    emit('close');
  } catch {
    toast.error(t('export.restoreFailed'));
  }
}
</script>
