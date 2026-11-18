<template>
  <div class="min-h-screen bg-base-200 px-3 py-3 text-base-content sm:px-5 sm:py-4">
    <a href="#main" class="btn btn-primary btn-sm sr-only z-50 focus:not-sr-only focus:absolute focus:start-2 focus:top-2">{{ t('views.list') }}</a>

    <div class="mx-auto w-full space-y-3">
      <AppHeader @open-export="isExportOpen = true" />

      <div class="sq-md inline-flex bg-base-300/40 p-1 md:hidden" role="tablist" :aria-label="t('a11y.mainNav')">
        <button
          v-for="tab in tabs"
          :key="tab.value"
          type="button"
          role="tab"
          class="sq-sm inline-flex min-h-10 items-center gap-2 px-4 text-sm font-medium transition-colors"
          :class="mobileTab === tab.value ? 'bg-base-100 text-base-content shadow-sm' : 'text-base-content/70 hover:text-base-content'"
          :aria-selected="mobileTab === tab.value"
          @click="mobileTab = tab.value"
        >
          <AppIcon :name="tab.icon" :size="18" />
          {{ tab.label }}
          <span v-if="tab.count !== null" class="tabular text-xs text-base-content/60">{{ tab.count }}</span>
        </button>
      </div>

      <div class="grid gap-4 md:grid-cols-[minmax(20rem,24.5rem)_minmax(0,1fr)] lg:grid-cols-[minmax(22rem,26.5rem)_minmax(0,1fr)] md:items-start">
        <main
          id="main"
          class="min-w-0 space-y-3 md:max-h-[calc(100dvh-5.5rem)] md:overflow-y-auto md:pe-1"
          :class="mobileTab === 'list' ? 'block' : 'hidden md:block'"
        >
          <SmartInput @added="onTaskAdded" @focus-place="onFocusPlace" />

          <TaskList v-model:selected-destination-key="selectedDestinationKey" v-model:selected-task-id="selectedTaskId" @open-destination="focusDestination" />

          <TaskDetailCard :task="selectedTask" :destination="selectedDetailDestination" @open-destination="openDestination" @focus-globe="focusGlobeOnly" />

          <aside class="space-y-3">
            <NextTrip @open-destination="openDestination" />
            <PackingSuggestions />
          </aside>

          <footer class="pb-2 pt-1 text-center text-[11px] text-base-content/55">{{ t('app.footer') }}</footer>
        </main>

        <div class="min-w-0 md:sticky md:top-3" :class="mobileTab === 'map' ? 'block' : 'hidden md:block'">
          <TripGlobe
            ref="globeRef"
            :destinations="destinationList"
            :selected-destination-key="globeFocusKey"
            @sync-destination="onGlobeSync"
            @open-destination="openDestination"
          />
        </div>
      </div>
    </div>

    <DestinationModal :open="isDestinationOpen" :destination-key="activeDestinationKey" :trip-date="activeTripDate" @close="closeDestination" />
    <ExportModal :open="isExportOpen" @close="isExportOpen = false" />
    <ToastHost />
  </div>
</template>

<script setup>
import { computed, defineAsyncComponent, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import AppHeader from './components/AppHeader.vue';
import AppIcon from './components/AppIcon.vue';
import SmartInput from './components/SmartInput.vue';
import NextTrip from './components/NextTrip.vue';
import PackingSuggestions from './components/PackingSuggestions.vue';
import TaskList from './components/TaskList.vue';
import TaskDetailCard from './components/TaskDetailCard.vue';
import GlobeLoading from './components/GlobeLoading.vue';
import DestinationModal from './components/DestinationModal.vue';
import ExportModal from './components/ExportModal.vue';
import ToastHost from './components/ToastHost.vue';
import { useTasks } from './composables/useTasks.js';
import { useTheme } from './composables/useTheme.js';
import { useI18n } from './i18n/index.js';

const TripGlobe = defineAsyncComponent({
  loader: () => import('./components/TripGlobe.vue'),
  loadingComponent: GlobeLoading,
  delay: 0,
});

const { t } = useI18n();
useTheme();
const { tasks, destinations, destinationList, seedIfEmpty, refreshStale } = useTasks();

const mobileTab = ref('list');
const globeRef = ref(null);
const selectedDestinationKey = ref('all');
const globeFocusKey = ref(null);
const selectedTaskId = ref(null);

const isExportOpen = ref(false);
const isDestinationOpen = ref(false);
const activeDestinationKey = ref(null);

const tabs = computed(() => [
  { value: 'list', label: t('views.list'), icon: 'list', count: null },
  { value: 'map', label: t('views.map'), icon: 'globe', count: destinationList.value.length },
]);

const selectedTask = computed(() => tasks.value.find((task) => task.id === selectedTaskId.value) || null);

const selectedDetailDestination = computed(() => {
  const key = selectedTask.value?.destinationKey || (selectedDestinationKey.value !== 'all' ? selectedDestinationKey.value : null);
  return key ? destinations.value[key] || null : null;
});

const activeTripDate = computed(() => destinationList.value.find((d) => d.key === activeDestinationKey.value)?.tripDate || null);

// Keep selection valid when tasks are deleted or filtered by country.
watch(
  [tasks, selectedDestinationKey],
  () => {
    const visible = tasks.value.filter((task) => selectedDestinationKey.value === 'all' || task.destinationKey === selectedDestinationKey.value);
    const current = tasks.value.find((task) => task.id === selectedTaskId.value);
    if (current?.detection === 'pending') return;
    if (!visible.some((task) => task.id === selectedTaskId.value)) {
      selectedTaskId.value = visible[0]?.id || null;
    }
    if (selectedDestinationKey.value !== 'all') {
      globeFocusKey.value = selectedDestinationKey.value;
    }
  },
  { deep: true },
);

// Selecting a task (or resolving its destination) smoothly focuses the 3D Earth on it.
watch(
  () => selectedTask.value?.destinationKey,
  (key) => {
    if (!key) return;
    globeFocusKey.value = key;
    if (selectedDestinationKey.value !== 'all' && selectedDestinationKey.value !== key) {
      selectedDestinationKey.value = key;
    }
  },
);

function onTaskAdded(task) {
  selectedTaskId.value = task.id;
  if (task.destinationKey) {
    globeFocusKey.value = task.destinationKey;
  } else if (selectedDestinationKey.value !== 'all' && task.detection === 'none') {
    selectedDestinationKey.value = 'all';
  }
}

async function onFocusPlace(place) {
  mobileTab.value = 'map';
  await nextTick();
  globeRef.value?.focusLocation(place);
}

function focusDestination(key) {
  selectedDestinationKey.value = key;
  globeFocusKey.value = key;
  const firstMatch = tasks.value.find((task) => task.destinationKey === key);
  if (firstMatch) selectedTaskId.value = firstMatch.id;
}

function focusGlobeOnly(key) {
  globeFocusKey.value = key;
  mobileTab.value = 'map';
}

function onGlobeSync(key) {
  selectedDestinationKey.value = key;
  globeFocusKey.value = key;
  const firstMatch = tasks.value.find((task) => task.destinationKey === key);
  selectedTaskId.value = firstMatch?.id || null;
  mobileTab.value = 'list';
}

function openDestination(key) {
  activeDestinationKey.value = key;
  isDestinationOpen.value = true;
}

function closeDestination() {
  isDestinationOpen.value = false;
}

function onOnline() {
  refreshStale();
}

onMounted(() => {
  seedIfEmpty();
  refreshStale();
  if (!selectedTaskId.value && tasks.value.length > 0) {
    selectedTaskId.value = tasks.value[0].id;
    if (tasks.value[0].destinationKey) {
      globeFocusKey.value = tasks.value[0].destinationKey;
    }
  }
  window.addEventListener('online', onOnline);
});

onBeforeUnmount(() => {
  window.removeEventListener('online', onOnline);
});
</script>
