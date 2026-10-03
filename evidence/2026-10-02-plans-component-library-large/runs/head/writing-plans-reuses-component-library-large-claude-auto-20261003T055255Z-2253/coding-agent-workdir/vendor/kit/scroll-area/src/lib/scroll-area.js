import { esc } from '#kit/utils';

/**
 * Scrollable region with a fixed maximum height. Focusable, so it scrolls from the keyboard.
 *
 * @param {{children: string, label: string, maxHeight?: string}} opts
 *   `children` is trusted HTML.
 * @returns {string}
 */
export function scrollArea({ children, label, maxHeight = '20rem' }) {
  return `<div class="kit-scroll-area" style="max-height: ${esc(maxHeight)}" tabindex="0" aria-label="${esc(label)}">${children}</div>`;
}
