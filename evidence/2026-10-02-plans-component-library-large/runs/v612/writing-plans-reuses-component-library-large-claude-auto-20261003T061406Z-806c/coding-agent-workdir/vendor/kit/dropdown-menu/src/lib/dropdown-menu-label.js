import { cx, esc } from '#kit/utils';

/**
 * Dropdown menu label.
 *
 * @param {{text: string, class?: string}} opts
 * @returns {string}
 */
export function dropdownMenuLabel({ text, class: className = '' }) {
  return `<span class="${cx('kit-dropdown-menu__label', className)}">${esc(text)}</span>`;
}
