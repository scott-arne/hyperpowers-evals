import { cx, esc } from '#kit/utils';

/**
 * Dropdown menu keyboard shortcut hint.
 *
 * @param {{text: string, class?: string}} opts
 * @returns {string}
 */
export function dropdownMenuShortcut({ text, class: className = '' }) {
  return `<kbd class="${cx('kit-dropdown-menu__shortcut', className)}">${esc(text)}</kbd>`;
}
