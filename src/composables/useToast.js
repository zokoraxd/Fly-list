import { ref } from 'vue';
import { createId } from '../utils/id.js';

const DEFAULT_DURATION = 5000;

/** @type {import('vue').Ref<Toast[]>} */
const toasts = ref([]);
const timers = new Map();

/**
 * @typedef {Object} Toast
 * @property {string} id
 * @property {string} message
 * @property {'info' | 'success' | 'warning' | 'error'} variant
 * @property {{ label: string, handler: () => void } | null} action
 */

function dismiss(id) {
  const timer = timers.get(id);
  if (timer) {
    clearTimeout(timer);
    timers.delete(id);
  }
  toasts.value = toasts.value.filter((toast) => toast.id !== id);
}

/**
 * Show a toast message. Returns the toast id so callers can dismiss it early.
 *
 * @param {string} message
 * @param {{ variant?: Toast['variant'], duration?: number, action?: Toast['action'] }} [options]
 * @returns {string}
 */
function show(message, options = {}) {
  const id = createId('toast');
  const toast = {
    id,
    message,
    variant: options.variant || 'info',
    action: options.action || null,
  };
  toasts.value = [...toasts.value, toast].slice(-4);

  const duration = options.duration ?? DEFAULT_DURATION;
  if (duration > 0) {
    timers.set(
      id,
      setTimeout(() => dismiss(id), duration),
    );
  }
  return id;
}

/**
 * Global toast queue shared by all components.
 */
export function useToast() {
  return {
    toasts,
    show,
    dismiss,
    success: (message, options) => show(message, { ...options, variant: 'success' }),
    error: (message, options) => show(message, { ...options, variant: 'error' }),
    warning: (message, options) => show(message, { ...options, variant: 'warning' }),
  };
}
