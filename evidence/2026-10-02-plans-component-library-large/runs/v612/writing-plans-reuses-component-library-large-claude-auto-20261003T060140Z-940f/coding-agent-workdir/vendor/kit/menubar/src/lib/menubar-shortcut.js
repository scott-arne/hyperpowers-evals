import { cx, esc } from '#kit/utils';

/**
 * Menubar keyboard shortcut hint.
 *
 * @param {{text: string, class?: string}} opts
 * @returns {string}
 */
export function menubarShortcut({ text, class: className = '' }) {
  return `<kbd class="${cx('kit-menubar__shortcut', className)}">${esc(text)}</kbd>`;
}
