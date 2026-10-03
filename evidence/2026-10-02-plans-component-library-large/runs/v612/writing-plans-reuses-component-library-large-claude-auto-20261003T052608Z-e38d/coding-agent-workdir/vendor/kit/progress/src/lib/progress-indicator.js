import { cx } from '#kit/utils';

/**
 * Progress indicator.
 *
 * @param {{class?: string}} [opts]
 * @returns {string}
 */
export function progressIndicator({ class: className = '' } = {}) {
  return `<span class="${cx('kit-progress__indicator', className)}" aria-hidden="true"></span>`;
}
