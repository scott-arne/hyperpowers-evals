import { cx, esc } from '#kit/utils';

/**
 * Input otp single-character slot.
 *
 * @param {{char?: string, active?: boolean}} [opts]
 * @returns {string}
 */
export function inputOtpSlot({ char = '', active = false } = {}) {
  return `<span class="${cx('kit-input-otp__slot', active && 'kit-input-otp__slot--active')}">${esc(char)}</span>`;
}
