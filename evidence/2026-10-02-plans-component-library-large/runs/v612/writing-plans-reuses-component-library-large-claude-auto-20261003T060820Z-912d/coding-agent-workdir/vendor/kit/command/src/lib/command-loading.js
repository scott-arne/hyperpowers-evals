import { cx, esc } from '#kit/utils';

/**
 * Command loading message.
 *
 * @param {{text: string, class?: string}} opts
 * @returns {string}
 */
export function commandLoading({ text, class: className = '' }) {
  return `<p class="${cx('kit-command__loading', className)}" role="status">${esc(text)}</p>`;
}
