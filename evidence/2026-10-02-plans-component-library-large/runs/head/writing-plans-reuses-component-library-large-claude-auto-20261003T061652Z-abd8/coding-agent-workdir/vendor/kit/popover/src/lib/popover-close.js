import { esc } from '#kit/utils';

/**
 * Popover close button.
 *
 * @param {{label?: string}} [opts] Accessible name.
 * @returns {string}
 */
export function popoverClose({ label = 'Close' } = {}) {
  return `<button class="kit-popover__close" type="button" aria-label="${esc(label)}">×</button>`;
}
