<template>
  <section class="surface sq-lg overflow-hidden">
    <header class="flex flex-wrap items-center justify-between gap-2 border-b border-base-300/60 px-4 py-2.5">
      <div class="flex min-w-0 items-center gap-2">
        <h2 class="truncate text-sm font-semibold text-primary">
          {{ activeDestination ? t('views.listFor', { place: nameOf(activeDestination) }) : t('views.list') }}
        </h2>
        <span class="chip tabular !py-0.5 text-xs">{{ filteredTasks.length }}</span>
      </div>

      <button
        v-if="selectedDestinationKey !== 'all'"
        type="button"
        class="inline-flex min-h-8 items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium text-base-content/85 transition-colors hover:bg-base-200 hover:text-base-content"
        @click="destinationFilter = 'all'"
      >
        <AppIcon name="x" :size="14" />
        {{ t('views.allPlacesChip') }}
      </button>
    </header>

    <div class="space-y-2.5 p-3">
      <div class="space-y-2" role="group" :aria-label="t('a11y.mainNav')">
        <div class="sq-md inline-flex max-w-full overflow-x-auto bg-base-200/80 p-1">
          <button
            v-for="option in statusOptions"
            :key="option.value"
            type="button"
            class="sq-sm inline-flex min-h-8 shrink-0 items-center gap-1.5 whitespace-nowrap px-2.5 text-xs font-medium transition-colors"
            :class="statusFilter === option.value ? 'bg-base-100 text-base-content shadow-sm' : 'text-base-content/75 hover:text-base-content'"
            :aria-pressed="statusFilter === option.value"
            @click="statusFilter = option.value"
          >
            <span>{{ option.label }}</span>
            <span class="tabular text-xs" :class="statusFilter === option.value ? 'text-primary' : 'text-base-content/70'">{{ option.count }}</span>
          </button>
        </div>

        <div v-if="destinationList.length > 0" class="flex flex-wrap items-center justify-between gap-2">
          <select
            v-model="destinationFilter"
            class="surface sq-sm h-8 min-h-8 max-w-full cursor-pointer bg-base-100 px-3 text-xs font-medium text-base-content transition-colors hover:border-primary/60"
            :aria-label="t('filters.allPlaces')"
          >
            <option value="all">{{ t('filters.allPlaces') }}</option>
            <option v-for="destination in destinationList" :key="destination.key" :value="destination.key">
              {{ destination.flag }} {{ nameOf(destination) }}
            </option>
          </select>

          <label class="flex min-h-8 cursor-pointer items-center gap-2 rounded-lg px-1">
            <span class="text-xs font-medium text-base-content/80">{{ t('views.group') }}</span>
            <input v-model="groupByDestination" type="checkbox" class="toggle toggle-primary toggle-xs focus-visible:ring-2 focus-visible:ring-primary" />
          </label>
        </div>
      </div>

      <div v-if="filteredTasks.length === 0" class="flex flex-col items-center gap-2 px-4 py-8 text-center">
        <span class="sq-md flex size-11 items-center justify-center bg-primary/10 text-primary"><AppIcon name="globe" :size="22" /></span>
        <h3 class="text-sm font-semibold">{{ t('empty.title') }}</h3>
        <p class="max-w-xs text-xs leading-relaxed text-base-content/75">{{ isFiltered ? t('empty.filtered') : t('empty.default') }}</p>
      </div>

      <div v-else class="max-h-[19rem] space-y-2 overflow-y-auto pe-1">
        <template v-if="groupByDestination">
          <section
            v-for="group in groupedTasks"
            :key="group.key"
            class="sq-md border border-base-300/60 bg-base-200/40 p-2"
            :aria-labelledby="`group-${group.key}`"
          >
            <header class="flex items-center justify-between gap-2 px-2 pb-1.5 pt-1">
              <h3 :id="`group-${group.key}`" class="min-w-0 truncate text-sm font-semibold">
                <button
                  v-if="group.destination"
                  type="button"
                  class="inline-flex min-h-8 items-center gap-1.5 rounded-md hover:text-primary"
                  @click="emit('open-destination', group.destination.key)"
                >
                  <span aria-hidden="true">{{ group.destination.flag }}</span>
                  {{ nameOf(group.destination) }}
                </button>
                <template v-else>{{ t('group.general') }}</template>
              </h3>
              <div class="flex shrink-0 items-center gap-2 text-xs text-base-content/75 tabular">
                <span v-if="group.destination?.weather?.current" class="hidden sm:inline">
                  <bdi dir="ltr">{{ group.destination.weather.current.temperature }}°C</bdi>
                  <span aria-hidden="true" class="ms-1">{{ group.destination.weather.current.icon }}</span>
                </span>
                <span>{{ t('group.progress', { done: group.done, total: group.tasks.length }) }}</span>
              </div>
            </header>
            <p v-if="group.tripDate" class="px-2 pb-1.5 text-xs font-medium text-accent tabular">
              {{ t('group.trip', { date: formatDate(group.tripDate, { weekday: 'short', day: 'numeric', month: 'short' }) }) }}
            </p>
            <ul class="space-y-1">
              <TaskItem
                v-for="task in group.tasks"
                :key="task.id"
                :task="task"
                :destination="task.destinationKey ? destinations[task.destinationKey] : null"
                :selected="task.id === selectedTaskId"
                @select="emit('update:selectedTaskId', $event)"
                @open-destination="emit('open-destination', $event)"
              />
            </ul>
          </section>
        </template>

        <ul v-else class="space-y-1">
          <TaskItem
            v-for="task in filteredTasks"
            :key="task.id"
            :task="task"
            :destination="task.destinationKey ? destinations[task.destinationKey] : null"
            :selected="task.id === selectedTaskId"
            @select="emit('update:selectedTaskId', $event)"
            @open-destination="emit('open-destination', $event)"
          />
        </ul>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed, ref, watch } from 'vue';
import AppIcon from './AppIcon.vue';
import TaskItem from './TaskItem.vue';
import { useTasks } from '../composables/useTasks.js';
import { useI18n } from '../i18n/index.js';
import { localizedName } from '../utils/placeName.js';

const props = defineProps({
  selectedDestinationKey: { type: String, default: 'all' },
  selectedTaskId: { type: String, default: null },
});

const emit = defineEmits(['open-destination', 'update:selectedDestinationKey', 'update:selectedTaskId']);

const { t, locale, formatDate } = useI18n();

const nameOf = (destination) => localizedName(destination, locale.value);
const { tasks, destinations, destinationList } = useTasks();

const statusFilter = ref('all');
const groupByDestination = ref(false);

const destinationFilter = computed({
  get: () => props.selectedDestinationKey,
  set: (value) => emit('update:selectedDestinationKey', value || 'all'),
});

const activeDestination = computed(() => (props.selectedDestinationKey !== 'all' ? destinations.value[props.selectedDestinationKey] || null : null));

function countByStatus(status) {
  return tasks.value.filter((task) => {
    if (props.selectedDestinationKey !== 'all' && task.destinationKey !== props.selectedDestinationKey) return false;
    return task.status === status;
  }).length;
}

const statusOptions = computed(() => {
  const totalForPlace =
    props.selectedDestinationKey === 'all' ? tasks.value.length : tasks.value.filter((task) => task.destinationKey === props.selectedDestinationKey).length;
  return [
    { value: 'all', label: t('filters.all'), count: totalForPlace },
    { value: 'planned', label: t('filters.planned'), count: countByStatus('planned') },
    { value: 'in-progress', label: t('filters.inProgress'), count: countByStatus('in-progress') },
    { value: 'completed', label: t('filters.completed'), count: countByStatus('completed') },
  ];
});

watch(destinationList, (list) => {
  if (props.selectedDestinationKey !== 'all' && !list.some((d) => d.key === props.selectedDestinationKey)) {
    emit('update:selectedDestinationKey', 'all');
  }
});

const isFiltered = computed(() => statusFilter.value !== 'all' || props.selectedDestinationKey !== 'all');

const filteredTasks = computed(() =>
  tasks.value.filter((task) => {
    if (statusFilter.value !== 'all' && task.status !== statusFilter.value) return false;
    if (props.selectedDestinationKey !== 'all' && task.destinationKey !== props.selectedDestinationKey) return false;
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
  for (const group of groups.values()) group.tasks.sort(byDateThenNewest);

  return [...groups.values()].sort((a, b) => {
    if (a.tripDate && b.tripDate) return a.tripDate.localeCompare(b.tripDate);
    if (a.tripDate) return -1;
    if (b.tripDate) return 1;
    if (a.destination && !b.destination) return -1;
    if (!a.destination && b.destination) return 1;
    return 0;
  });
});
</script>
