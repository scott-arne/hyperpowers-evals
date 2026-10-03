import { cx } from '#kit/utils';

/**
 * Input otp caret for the active slot.
 *
 * @param {{class?: string}} [opts]
 * @returns {string}
 */
export function inputOtpCaret({ class: className = '' } = {}) {
  return `<span class="${cx('kit-input-otp__caret', className)}" aria-hidden="true"></span>`;
}
