import { esc } from '#kit/utils';

/**
 * Keyboard key, or a chord when given several keys.
 *
 * @param {string | string[]} keys
 * @returns {string}
 */
export function kbd(keys) {
  return []
    .concat(keys)
    .map((k) => `<kbd class="kit-kbd">${esc(k)}</kbd>`)
    .join('+');
}
