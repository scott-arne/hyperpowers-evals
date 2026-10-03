import { cx, esc } from '#kit/utils';

/**
 * Command keyboard shortcut hint.
 *
 * @param {{text: string, class?: string}} opts
 * @returns {string}
 */
export function commandShortcut({ text, class: className = '' }) {
  return `<kbd class="${cx('kit-command__shortcut', className)}">${esc(text)}</kbd>`;
}
