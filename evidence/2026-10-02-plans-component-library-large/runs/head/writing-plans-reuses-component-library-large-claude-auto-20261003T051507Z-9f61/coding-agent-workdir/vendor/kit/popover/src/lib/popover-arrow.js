import { cx } from '#kit/utils';

/**
 * Popover arrow pointing at the trigger.
 *
 * @param {{class?: string}} [opts]
 * @returns {string}
 */
export function popoverArrow({ class: className = '' } = {}) {
  return `<span class="${cx('kit-popover__arrow', className)}" aria-hidden="true"></span>`;
}
