import { attrs, esc } from '#kit/utils';

/**
 * Form label.
 *
 * @param {{text: string, for?: string}} opts
 * @returns {string}
 */
export function label({ text, for: htmlFor }) {
  return `<label class="kit-label"${attrs({ for: htmlFor })}>${esc(text)}</label>`;
}
