import { esc } from '#kit/utils';

/**
 * Loading spinner with an accessible label.
 *
 * @param {{label?: string}} [opts]
 * @returns {string}
 */
export function spinner({ label = 'Loading' } = {}) {
  return `<span class="kit-spinner" role="status"><span class="kit-sr-only">${esc(label)}</span></span>`;
}
