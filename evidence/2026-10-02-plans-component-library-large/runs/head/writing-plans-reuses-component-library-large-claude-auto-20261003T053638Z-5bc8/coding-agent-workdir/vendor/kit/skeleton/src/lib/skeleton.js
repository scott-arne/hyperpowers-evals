import { esc } from '#kit/utils';

/**
 * Placeholder block shown while content loads.
 *
 * @param {{width?: string, height?: string}} [opts] CSS lengths.
 * @returns {string}
 */
export function skeleton({ width = '100%', height = '1rem' } = {}) {
  return `<span class="kit-skeleton" style="width: ${esc(width)}; height: ${esc(height)}" aria-hidden="true"></span>`;
}
