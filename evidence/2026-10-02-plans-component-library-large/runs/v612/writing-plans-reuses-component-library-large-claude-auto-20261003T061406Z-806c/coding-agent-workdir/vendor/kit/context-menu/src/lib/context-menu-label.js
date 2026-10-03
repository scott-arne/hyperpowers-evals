import { cx, esc } from '#kit/utils';

/**
 * Context menu label.
 *
 * @param {{text: string, class?: string}} opts
 * @returns {string}
 */
export function contextMenuLabel({ text, class: className = '' }) {
  return `<span class="${cx('kit-context-menu__label', className)}">${esc(text)}</span>`;
}
