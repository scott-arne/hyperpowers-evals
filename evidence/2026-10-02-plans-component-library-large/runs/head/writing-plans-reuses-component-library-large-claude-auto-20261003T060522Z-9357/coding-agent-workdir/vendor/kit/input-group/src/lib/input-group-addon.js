import { cx, esc } from '#kit/utils';

/**
 * Input group addon, text or an icon at either end.
 *
 * @param {{text: string, class?: string}} opts
 * @returns {string}
 */
export function inputGroupAddon({ text, class: className = '' }) {
  return `<span class="${cx('kit-input-group__addon', className)}">${esc(text)}</span>`;
}
