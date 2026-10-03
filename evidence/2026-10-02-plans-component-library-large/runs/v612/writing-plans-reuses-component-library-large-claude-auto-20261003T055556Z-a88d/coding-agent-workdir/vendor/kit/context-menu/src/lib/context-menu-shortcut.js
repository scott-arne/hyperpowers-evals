import { cx, esc } from '#kit/utils';

/**
 * Context menu keyboard shortcut hint.
 *
 * @param {{text: string, class?: string}} opts
 * @returns {string}
 */
export function contextMenuShortcut({ text, class: className = '' }) {
  return `<kbd class="${cx('kit-context-menu__shortcut', className)}">${esc(text)}</kbd>`;
}
