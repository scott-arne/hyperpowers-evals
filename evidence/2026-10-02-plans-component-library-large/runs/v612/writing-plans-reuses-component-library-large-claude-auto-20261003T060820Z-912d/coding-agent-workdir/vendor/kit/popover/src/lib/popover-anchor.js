import { cx } from '#kit/utils';

/**
 * Popover anchor, which positions the content when the trigger is elsewhere.
 *
 * @param {{class?: string}} [opts]
 * @returns {string}
 */
export function popoverAnchor({ class: className = '' } = {}) {
  return `<span class="${cx('kit-popover__anchor', className)}" aria-hidden="true"></span>`;
}
