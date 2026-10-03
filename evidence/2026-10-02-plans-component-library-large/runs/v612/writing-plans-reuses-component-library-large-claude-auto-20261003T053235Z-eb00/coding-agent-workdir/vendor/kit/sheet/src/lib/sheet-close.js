import { esc } from '#kit/utils';

/**
 * Sheet close button.
 *
 * @param {{label?: string}} [opts] Accessible name.
 * @returns {string}
 */
export function sheetClose({ label = 'Close' } = {}) {
  return `<button class="kit-sheet__close" type="button" aria-label="${esc(label)}">×</button>`;
}
