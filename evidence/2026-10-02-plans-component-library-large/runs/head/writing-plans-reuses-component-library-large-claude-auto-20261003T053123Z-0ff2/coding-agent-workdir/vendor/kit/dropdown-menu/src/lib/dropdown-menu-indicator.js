import { cx } from '#kit/utils';

/**
 * Dropdown menu indicator.
 *
 * @param {{class?: string}} [opts]
 * @returns {string}
 */
export function dropdownMenuIndicator({ class: className = '' } = {}) {
  return `<span class="${cx('kit-dropdown-menu__indicator', className)}" aria-hidden="true"></span>`;
}
