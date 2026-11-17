<template>
  <div class="surface sq-lg flex h-[70dvh] min-h-[26rem] w-full items-center justify-center lg:h-[36rem]" role="status" :aria-label="t('map.loading')">
    <span class="loading loading-ring loading-lg text-primary" aria-hidden="true"></span>
  </div>
</template>

<script setup>
import { useI18n } from '../i18n/index.js';

const { t } = useI18n();
</script>
