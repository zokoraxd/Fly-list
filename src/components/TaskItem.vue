<template>
  <li
    class="task-row group flex items-center gap-1.5 rounded-xl border px-1.5 py-0.5 transition-colors"
    :class="selected ? 'border-accent/70 bg-accent/10' : 'border-transparent hover:bg-base-200/70 focus-within:bg-base-200/70'"
  >
    <button
      type="button"
      class="icon-btn shrink-0"
      :class="statusIcon.class"
      :aria-label="t('a11y.statusOf', { status: statusLabel })"
      :title="`${statusLabel} (${t('status.cycle')})`"
      @click="cycleStatus(task.id)"
    >
      <AppIcon :name="statusIcon.name" :size="22" />
    </button>

    <div class="min-w-0 flex-1 py-2">
      <form v-if="isEditing" class="flex items-center gap-2" @submit.prevent="saveEdit">
        <input
          ref="editInput"
          v-model="draft"
          type="text"
          dir="auto"
          class="input input-bordered input-sm sq-sm h-10 w-full text-sm focus-visible:ring-2 focus-visible:ring-primary"
          :aria-label="t('task.editTitleLabel')"
          @keydown.esc.prevent="cancelEdit"
          @blur="saveEdit"
        />
        <button type="submit" class="btn btn-primary btn-sm sq-sm h-10 px-3">{{ t('task.save') }}</button>
      </form>

      <template v-else>
        <button
          type="button"
          class="block w-full rounded-md text-start text-[15px] leading-snug sm:truncate focus-visible:ring-2 focus-visible:ring-primary"
          :class="task.status === 'completed' ? 'text-base-content/65 line-through' : 'font-medium text-base-content'"
          @click="emit('select', task.id)"
          @dblclick="startEdit"
        >
          {{ task.title }}
        </button>

        <div class="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
          <span v-if="task.detection === 'pending'" class="skeleton h-6 w-28 rounded-full" role="status" :aria-label="t('task.detecting')"></span>

          <button
            v-else-if="destination"
            type="button"
            class="chip hit-slop tabular !bg-primary/15 !text-primary transition-colors hover:!bg-primary/25"
            :aria-label="t('task.viewDestination', { name: destinationName })"
            :title="t('task.viewDestination', { name: destinationName })"
            @click="emit('open-destination', destination.key)"
          >
            <span aria-hidden="true">{{ destination.flag }}</span>
            <span class="truncate">{{ destinationName }}</span>
            <span v-if="destination.weather?.current && destination.weather.current.temperature !== null" class="whitespace-nowrap">
              <bdi dir="ltr">{{ destination.weather.current.temperature }}°C</bdi>
              <span aria-hidden="true" class="ms-1">{{ destination.weather.current.icon }}</span>
            </span>
            <AppIcon v-else-if="destination.weatherError" name="alert" :size="14" class="text-warning" :title="t('task.detectionFailed')" />
          </button>

          <button
            v-if="destination?.weatherError"
            type="button"
            class="hit-slop inline-flex items-center gap-1 rounded-md text-xs font-medium text-warning hover:underline"
            @click="refreshDestination(destination.key, { force: true })"
          >
            <AppIcon name="refresh" :size="14" />
            {{ t('task.retry') }}
          </button>

          <span class="inline-flex items-center gap-1">
            <button
              type="button"
              class="hit-slop inline-flex min-h-6 items-center gap-1.5 rounded-lg text-xs tabular hover:text-base-content"
              :class="dateClass"
              :title="task.dueDate ? t('task.changeDate') : t('task.setDate')"
              @click="openDatePicker"
            >
              <AppIcon name="calendar" :size="14" />
              <span v-if="task.dueDate">{{ dateLabel }}</span>
              <span v-else>{{ t('task.setDate') }}</span>
            </button>
            <button
              v-if="task.dueDate"
              type="button"
              class="hit-slop inline-flex size-6 items-center justify-center rounded-md text-base-content/70 hover:text-error"
              :aria-label="t('task.clearDate')"
              :title="t('task.clearDate')"
              @click="setDueDate(task.id, null)"
            >
              <AppIcon name="x" :size="14" />
            </button>
          </span>
          <input ref="dateInput" type="date" class="sr-only" :value="task.dueDate || ''" :aria-label="t('a11y.dueDate')" tabindex="-1" @change="onDateChange" />
        </div>
      </template>
    </div>

    <div class="task-actions flex shrink-0 items-center">
      <button type="button" class="icon-btn" :aria-label="t('task.edit')" :title="t('task.edit')" @click="startEdit">
        <AppIcon name="pencil" :size="17" />
      </button>
      <button
        type="button"
        class="icon-btn hover:!bg-error/15 hover:!text-error"
        :aria-label="t('task.delete')"
        :title="t('task.delete')"
        @click="removeTask(task.id)"
      >
        <AppIcon name="trash" :size="17" />
      </button>
    </div>
  </li>
</template>

<script setup>
import { computed, nextTick, ref } from 'vue';
import AppIcon from './AppIcon.vue';
import { useTasks } from '../composables/useTasks.js';
import { useI18n } from '../i18n/index.js';
import { daysUntil } from '../utils/dateParser.js';
import { localizedName } from '../utils/placeName.js';

const props = defineProps({
  task: { type: Object, required: true },
  destination: { type: Object, default: null },
  selected: { type: Boolean, default: false },
});

const emit = defineEmits(['open-destination', 'select']);

const { t, locale, formatDate } = useI18n();
const { cycleStatus, updateTitle, setDueDate, removeTask, refreshDestination } = useTasks();

const destinationName = computed(() => localizedName(props.destination, locale.value));

const isEditing = ref(false);
const draft = ref('');
const editInput = ref(null);
const dateInput = ref(null);

const statusLabel = computed(() => {
  switch (props.task.status) {
    case 'in-progress':
      return t('status.inProgress');
    case 'completed':
      return t('status.completed');
    default:
      return t('status.planned');
  }
});

/** Planned = empty ring, in progress = half-filled ring, done = ring with a check. */
const statusIcon = computed(() => {
  switch (props.task.status) {
    case 'in-progress':
      return { name: 'circle-half', class: '!text-warning' };
    case 'completed':
      return { name: 'circle-check', class: '!text-success' };
    default:
      return { name: 'circle', class: '!text-base-content/70' };
  }
});

const daysLeft = computed(() => (props.task.dueDate ? daysUntil(props.task.dueDate) : null));

const dateLabel = computed(() => {
  if (!props.task.dueDate) return '';
  const n = daysLeft.value;
  const absolute = formatDate(props.task.dueDate);
  if (n === 0) return `${t('dates.today')} (${absolute})`;
  if (n === 1) return `${t('dates.tomorrow')} (${absolute})`;
  if (n === -1) return `${t('dates.yesterday')} (${absolute})`;
  if (n !== null && n > 1 && n <= 14) return `${t('dates.inDays', { n })} (${absolute})`;
  if (n !== null && n < -1 && n >= -14) return `${t('dates.daysAgo', { n: Math.abs(n) })} (${absolute})`;
  return formatDate(props.task.dueDate, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
});

const dateClass = computed(() => {
  if (!props.task.dueDate) return 'text-base-content/75';
  if (props.task.status === 'completed') return 'text-base-content/65';
  if (daysLeft.value !== null && daysLeft.value < 0) return 'text-error font-medium';
  if (daysLeft.value !== null && daysLeft.value <= 2) return 'text-warning font-medium';
  return 'text-base-content/80';
});

function startEdit() {
  draft.value = props.task.title;
  isEditing.value = true;
  nextTick(() => {
    editInput.value?.focus();
    editInput.value?.select();
  });
}

function saveEdit() {
  if (!isEditing.value) return;
  isEditing.value = false;
  const next = draft.value.trim();
  if (next && next !== props.task.title) updateTitle(props.task.id, next);
}

function cancelEdit() {
  draft.value = props.task.title;
  isEditing.value = false;
}

function openDatePicker() {
  const el = dateInput.value;
  if (!el) return;
  if (typeof el.showPicker === 'function') {
    try {
      el.showPicker();
      return;
    } catch {
      // Some browsers throw unless triggered by a direct gesture; fall through.
    }
  }
  el.focus();
  el.click();
}

function onDateChange(event) {
  setDueDate(props.task.id, event.target.value || null);
}
</script>

<style scoped>
@media (hover: hover) and (pointer: fine) {
  .task-actions {
    opacity: 0.65;
    transition: opacity 150ms ease;
  }
  .task-row:hover .task-actions,
  .task-row:focus-within .task-actions {
    opacity: 1;
  }
}
</style>
