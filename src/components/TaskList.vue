<template>
  <section class="space-y-3">
    <div class="flex flex-wrap items-center gap-2" role="group" :aria-label="t('a11y.mainNav')">
      <div class="sq-md inline-flex max-w-full overflow-x-auto bg-base-300/40 p-1">
        <button
          v-for="option in statusOptions"
          :key="option.value"
          type="button"
          class="sq-sm inline-flex min-h-11 shrink-0 sm:min-h-9 items-center gap-1.5 whitespace-nowrap px-3 text-sm font-medium transition-colors"
          :class="statusFilter === option.value ? 'bg-base-100 text-base-content shadow-sm' : 'text-base-content/70 hover:text-base-content'"
          :aria-pressed="statusFilter === option.value"
          @click="statusFilter = option.value"
        >
          {{ option.label }}
          <span class="tabular text-xs" :class="statusFilter === option.value ? 'text-primary' : 'text-base-content/60'">{{ option.count }}</span>
        </button>
      </div>

      <select
        v-if="destinationList.length > 0"
        v-model="destinationFilter"
        class="select select-bordered select-sm sq-sm h-11 min-h-11 text-sm sm:h-9 sm:min-h-9"
        :aria-label="t('filters.allPlaces')"
      >
        <option value="all">{{ t('filters.allPlaces') }}</option>
        <option v-for="destination in destinationList" :key="destination.key" :value="destination.key">{{ destination.flag }} {{ nameOf(destination) }}</option>
      </select>

      <label v-if="destinationList.length > 0" class="ms-auto flex min-h-11 cursor-pointer items-center gap-2 sm:min-h-9">
        <span class="text-sm text-base-content/75">{{ t('views.group') }}</span>
        <input v-model="groupByDestination" type="checkbox" class="toggle toggle-primary toggle-sm" />
      </label>
    </div>

    <div v-if="filteredTasks.length === 0" class="surface sq-lg flex flex-col items-center gap-2 px-6 py-12 text-center">
      <span class="sq-md flex size-12 items-center justify-center bg-primary/10 text-primary"><AppIcon name="globe" :size="24" /></span>
      <h3 class="text-base font-semibold">{{ t('empty.title') }}</h3>
      <p class="max-w-sm text-sm text-base-content/70">{{ isFiltered ? t('empty.filtered') : t('empty.default') }}</p>
    </div>

    <template v-else-if="groupByDestination">
      <section v-for="group in groupedTasks" :key="group.key" class="surface sq-lg p-2" :aria-labelledby="`group-${group.key}`">
        <header class="flex items-center justify-between gap-3 px-3 pb-1 pt-2">
          <h3 :id="`group-${group.key}`" class="min-w-0 truncate text-base font-semibold">
            <button
              v-if="group.destination"
              type="button"
              class="inline-flex min-h-9 items-center gap-2 hover:text-primary"
              @click="emit('open-destination', group.destination.key)"
            >
              <span aria-hidden="true">{{ group.destination.flag }}</span>
              {{ nameOf(group.destination) }}
            </button>
            <template v-else>{{ t('group.general') }}</template>
          </h3>
          <div class="flex shrink-0 items-center gap-3 text-sm text-base-content/70 tabular">
            <span v-if="group.destination?.weather?.current" class="hidden sm:inline"
              >{{ group.destination.weather.current.temperature }}°C {{ group.destination.weather.current.icon }}</span
            >
            <span>{{ t('group.progress', { done: group.done, total: group.tasks.length }) }}</span>
            <progress
              class="progress progress-primary hidden h-1.5 w-20 sm:block"
              :value="group.done"
              :max="group.tasks.length"
              :aria-label="t('group.progress', { done: group.done, total: group.tasks.length })"
            ></progress>
          </div>
        </header>
        <p v-if="group.tripDate" class="px-3 pb-1 text-sm text-accent tabular">
          {{ t('group.trip', { date: formatDate(group.tripDate, { weekday: 'short', day: 'numeric', month: 'short' }) }) }}
        </p>
        <ul class="space-y-0.5">
          <TaskItem
            v-for="task in group.tasks"
            :key="task.id"
            :task="task"
            :destination="task.destinationKey ? destinations[task.destinationKey] : null"
            @open-destination="emit('open-destination', $event)"
          />
        </ul>
      </section>
    </template>

    <ul v-else class="surface sq-lg space-y-0.5 p-2">
      <TaskItem
        v-for="task in filteredTasks"
        :key="task.id"
        :task="task"
        :destination="task.destinationKey ? destinations[task.destinationKey] : null"
        @open-destination="emit('open-destination', $event)"
      />
    </ul>
  </section>
</template>

<script setup>
import { computed, ref, watch } from 'vue';
import AppIcon from './AppIcon.vue';
import TaskItem from './TaskItem.vue';
import { useTasks } from '../composables/useTasks.js';
import { useI18n } from '../i18n/index.js';
import { localizedName } from '../utils/placeName.js';

const emit = defineEmits(['open-destination']);

const { t, locale, formatDate } = useI18n();

const nameOf = (destination) => localizedName(destination, locale.value);
const { tasks, destinations, destinationList } = useTasks();

const statusFilter = ref('all');
const destinationFilter = ref('all');
const groupByDestination = ref(false);

function countByStatus(status) {
  return tasks.value.filter((task) => task.status === status).length;
}

const statusOptions = computed(() => [
  { value: 'all', label: t('filters.all'), count: tasks.value.length },
  { value: 'planned', label: t('filters.planned'), count: countByStatus('planned') },
  { value: 'in-progress', label: t('filters.inProgress'), count: countByStatus('in-progress') },
  { value: 'completed', label: t('filters.completed'), count: countByStatus('completed') },
]);

watch(destinationList, (list) => {
  if (destinationFilter.value !== 'all' && !list.some((d) => d.key === destinationFilter.value)) {
    destinationFilter.value = 'all';
  }
});

const isFiltered = computed(() => statusFilter.value !== 'all' || destinationFilter.value !== 'all');

const filteredTasks = computed(() =>
  tasks.value.filter((task) => {
    if (statusFilter.value !== 'all' && task.status !== statusFilter.value) return false;
    if (destinationFilter.value !== 'all' && task.destinationKey !== destinationFilter.value) return false;
    return true;
  }),
);

function byDateThenNewest(a, b) {
  if (a.dueDate && b.dueDate && a.dueDate !== b.dueDate) return a.dueDate.localeCompare(b.dueDate);
  if (a.dueDate && !b.dueDate) return -1;
  if (!a.dueDate && b.dueDate) return 1;
  return b.createdAt.localeCompare(a.createdAt);
}

const groupedTasks = computed(() => {
  const groups = new Map();
  for (const task of filteredTasks.value) {
    const key = task.destinationKey && destinations.value[task.destinationKey] ? task.destinationKey : '__general';
    if (!groups.has(key)) {
      groups.set(key, { key, destination: key === '__general' ? null : destinations.value[key], tasks: [], done: 0, tripDate: null });
    }
    const group = groups.get(key);
    group.tasks.push(task);
    if (task.status === 'completed') group.done += 1;
    if (task.dueDate && (!group.tripDate || task.dueDate < group.tripDate)) group.tripDate = task.dueDate;
  }

  const list = Array.from(groups.values());
  for (const group of list) group.tasks.sort(byDateThenNewest);
  return list.sort((a, b) => {
    if (a.key === '__general') return 1;
    if (b.key === '__general') return -1;
    if (a.tripDate && b.tripDate) return a.tripDate.localeCompare(b.tripDate);
    if (a.tripDate) return -1;
    if (b.tripDate) return 1;
    return 0;
  });
});
</script>
