<template>
  <dialog
    ref="dialogRef"
    class="modal modal-bottom sm:modal-middle"
    :aria-labelledby="labelledBy"
    @close="onNativeClose"
    @cancel.prevent="emit('close')"
    @click="onBackdropClick"
  >
    <div
      class="modal-box sq-lg w-full overflow-hidden border border-base-300/70 bg-base-100 p-0 shadow-2xl max-sm:rounded-b-none"
      :class="boxClass"
      @click.stop
    >
      <slot />
    </div>
  </dialog>
</template>

<script setup>
import { onBeforeUnmount, ref, watch } from 'vue';

const props = defineProps({
  open: { type: Boolean, default: false },
  labelledBy: { type: String, default: undefined },
  boxClass: { type: [String, Array, Object], default: 'max-w-xl' },
});

const emit = defineEmits(['close']);
const dialogRef = ref(null);

function sync(open) {
  const el = dialogRef.value;
  if (!el) return;
  if (open && !el.open) {
    if (typeof el.showModal === 'function') el.showModal();
    else el.setAttribute('open', '');
  } else if (!open && el.open) {
    el.close();
  }
}

watch(() => props.open, sync, { flush: 'post' });

watch(dialogRef, (el) => {
  if (el && props.open) sync(true);
});

function onNativeClose() {
  if (props.open) emit('close');
}

function onBackdropClick(event) {
  if (event.target === dialogRef.value) emit('close');
}

onBeforeUnmount(() => {
  const el = dialogRef.value;
  if (el?.open) el.close();
});
</script>

<style scoped>
.modal {
  background: transparent;
}
.modal::backdrop {
  background: rgb(11 22 38 / 0.6);
}
</style>
