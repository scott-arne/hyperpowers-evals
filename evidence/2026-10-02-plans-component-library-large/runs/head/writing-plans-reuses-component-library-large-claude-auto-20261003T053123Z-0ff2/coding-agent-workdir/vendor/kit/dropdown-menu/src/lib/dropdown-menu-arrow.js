import { cx } from '#kit/utils';

/**
 * Dropdown menu arrow pointing at the trigger.
 *
 * @param {{class?: string}} [opts]
 * @returns {string}
 */
export function dropdownMenuArrow({ class: className = '' } = {}) {
  return `<span class="${cx('kit-dropdown-menu__arrow', className)}" aria-hidden="true"></span>`;
}
