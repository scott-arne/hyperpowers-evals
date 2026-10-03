import { esc } from '#kit/utils';

/**
 * Tooltip. Wraps a control and shows `text` on hover and focus.
 *
 * @param {{text: string, children: string}} opts `children` is trusted HTML.
 * @returns {string}
 */
export function tooltip({ text, children }) {
  return `<span class="kit-tooltip">${children}<span class="kit-tooltip__content" role="tooltip">${esc(text)}</span></span>`;
}
