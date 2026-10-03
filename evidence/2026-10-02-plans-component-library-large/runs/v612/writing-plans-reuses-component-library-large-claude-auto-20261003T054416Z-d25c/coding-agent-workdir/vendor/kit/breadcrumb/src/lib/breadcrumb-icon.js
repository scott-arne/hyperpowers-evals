import { cx } from '#kit/utils';

/**
 * Breadcrumb icon slot.
 *
 * @param {{class?: string}} [opts]
 * @returns {string}
 */
export function breadcrumbIcon({ class: className = '' } = {}) {
  return `<span class="${cx('kit-breadcrumb__icon', className)}" aria-hidden="true"></span>`;
}
