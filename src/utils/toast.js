/**
 * Lightweight event-bus toast utility.
 * Usage: import { toast } from '../utils/toast';
 *        toast.success('Saved!');
 *        toast.error('Something went wrong.');
 *        toast.info('Copied to clipboard.');
 *        toast.warning('Check your input.');
 */

const listeners = new Set();

const emit = (event) => {
  listeners.forEach((fn) => fn(event));
};

export const subscribe = (fn) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};

export const toast = {
  success: (message, duration = 3000) => emit({ type: 'success', message, duration }),
  error:   (message, duration = 4000) => emit({ type: 'error',   message, duration }),
  info:    (message, duration = 3000) => emit({ type: 'info',    message, duration }),
  warning: (message, duration = 3500) => emit({ type: 'warning', message, duration }),
};
