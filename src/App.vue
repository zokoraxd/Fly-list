<template>
  <div class="min-h-screen bg-base-200 px-4 py-4 text-base-content sm:px-6 sm:py-6">
    <a href="#main" class="btn btn-primary btn-sm sr-only z-50 focus:not-sr-only focus:absolute focus:start-2 focus:top-2">{{ t('views.list') }}</a>

    <div class="mx-auto max-w-5xl space-y-5">
      <AppHeader @open-export="isExportOpen = true" />

      <div class="grid gap-x-6 gap-y-5 lg:grid-cols-[minmax(0,1fr)_20rem] lg:grid-rows-[auto_1fr]">
        <SmartInput class="lg:col-start-1 lg:row-start-1" />

        <aside class="space-y-3 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:sticky lg:top-6 lg:self-start">
          <NextTrip @open-destination="openDestination" />
          <PackingSuggestions />
        </aside>

        <main id="main" class="min-w-0 space-y-3 lg:col-start-1 lg:row-start-2">
          <div class="sq-md inline-flex bg-base-300/40 p-1" role="tablist" :aria-label="t('a11y.mainNav')">
            <button
              v-for="tab in tabs"
              :key="tab.value"
              type="button"
              role="tab"
              class="sq-sm inline-flex min-h-11 items-center gap-2 px-4 text-sm font-medium transition-colors sm:min-h-9"
              :class="view === tab.value ? 'bg-base-100 text-base-content shadow-sm' : 'text-base-content/70 hover:text-base-content'"
              :aria-selected="view === tab.value"
              @click="view = tab.value"
            >
              <AppIcon :name="tab.icon" :size="18" />
              {{ tab.label }}
              <span v-if="tab.count !== null" class="tabular text-xs text-base-content/60">{{ tab.count }}</span>
            </button>
          </div>

          <TripGlobe v-if="view === 'map'" :destinations="destinationList" @select-destination="openDestination" />
          <TaskList v-else @open-destination="openDestination" />
        </main>
      </div>

      <footer class="pb-6 pt-2 text-center text-xs text-base-content/65">{{ t('app.footer') }}</footer>
    </div>

    <DestinationModal :open="isDestinationOpen" :destination-key="activeDestinationKey" :trip-date="activeTripDate" @close="closeDestination" />
    <ExportModal :open="isExportOpen" @close="isExportOpen = false" />
    <ToastHost />
  </div>
</template>

<script setup>
import { computed, defineAsyncComponent, onBeforeUnmount, onMounted, ref } from 'vue';
import AppHeader from './components/AppHeader.vue';
import AppIcon from './components/AppIcon.vue';
import SmartInput from './components/SmartInput.vue';
import NextTrip from './components/NextTrip.vue';
import PackingSuggestions from './components/PackingSuggestions.vue';
import TaskList from './components/TaskList.vue';
import GlobeLoading from './components/GlobeLoading.vue';
import DestinationModal from './components/DestinationModal.vue';
import ExportModal from './components/ExportModal.vue';
import ToastHost from './components/ToastHost.vue';
import { useTasks } from './composables/useTasks.js';
import { useTheme } from './composables/useTheme.js';
import { useI18n } from './i18n/index.js';

// The 3D globe pulls in MapLibre, so it is only downloaded when the Globe tab is opened.
const TripGlobe = defineAsyncComponent({
  loader: () => import('./components/TripGlobe.vue'),
  loadingComponent: GlobeLoading,
  delay: 0,
});

const { t } = useI18n();
useTheme();
const { destinationList, seedIfEmpty, refreshStale } = useTasks();

const view = ref('list');
const isExportOpen = ref(false);
const isDestinationOpen = ref(false);
const activeDestinationKey = ref(null);

const tabs = computed(() => [
  { value: 'list', label: t('views.list'), icon: 'list', count: null },
  { value: 'map', label: t('views.map'), icon: 'globe', count: destinationList.value.length },
]);

const activeTripDate = computed(() => destinationList.value.find((d) => d.key === activeDestinationKey.value)?.tripDate || null);

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
  window.addEventListener('online', onOnline);
});

onBeforeUnmount(() => {
  window.removeEventListener('online', onOnline);
});
</script>
