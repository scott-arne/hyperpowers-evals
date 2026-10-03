import { cx } from '#kit/utils';

/**
 * Radio group indicator.
 *
 * @param {{class?: string}} [opts]
 * @returns {string}
 */
export function radioGroupIndicator({ class: className = '' } = {}) {
  return `<span class="${cx('kit-radio-group__indicator', className)}" aria-hidden="true"></span>`;
}
