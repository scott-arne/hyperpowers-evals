import { cx } from '#kit/utils';

/**
 * Navigation menu indicator.
 *
 * @param {{class?: string}} [opts]
 * @returns {string}
 */
export function navigationMenuIndicator({ class: className = '' } = {}) {
  return `<span class="${cx('kit-navigation-menu__indicator', className)}" aria-hidden="true"></span>`;
}
