import { cx } from '#kit/utils';

/**
 * Accordion icon slot.
 *
 * @param {{class?: string}} [opts]
 * @returns {string}
 */
export function accordionIcon({ class: className = '' } = {}) {
  return `<span class="${cx('kit-accordion__icon', className)}" aria-hidden="true"></span>`;
}
