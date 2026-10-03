import { attrs, cx } from '#kit/utils';

/**
 * One-time code input, one slot per character.
 *
 * @param {object} [opts]
 * @param {string} [opts.children] Trusted HTML.
 * @param {string} [opts.class] Extra class names.
 * @param {Record<string, string | boolean>} [opts.attrs] Extra attributes.
 * @returns {string}
 */
export function inputOtp({ children = '', class: className = '', attrs: extra = {} } = {}) {
  return `<div class="${cx('kit-input-otp', className)}"${attrs(extra)}>${children}</div>`;
}
