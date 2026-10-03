import { cx, esc } from '#kit/utils';

/**
 * Input group text.
 *
 * @param {{text: string, class?: string}} opts
 * @returns {string}
 */
export function inputGroupText({ text, class: className = '' }) {
  return `<span class="${cx('kit-input-group__text', className)}">${esc(text)}</span>`;
}
