import { cx, esc } from '#kit/utils';

/**
 * Dropdown menu trigger, the control that opens it.
 *
 * @param {{label: string, class?: string}} opts
 * @returns {string}
 */
export function dropdownMenuTrigger({ label, class: className = '' }) {
  return `<summary class="${cx('kit-dropdown-menu__trigger', className)}">${esc(label)}</summary>`;
}
