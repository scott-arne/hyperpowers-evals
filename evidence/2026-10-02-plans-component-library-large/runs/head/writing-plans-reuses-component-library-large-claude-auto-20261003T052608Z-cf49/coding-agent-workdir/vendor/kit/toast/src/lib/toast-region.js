import { attrs, cx } from '#kit/utils';

/**
 * Toast live region the toasts render into.
 *
 * @param {object} [opts]
 * @param {string} [opts.children] Trusted HTML.
 * @param {string} [opts.class] Extra class names.
 * @param {Record<string, string | boolean>} [opts.attrs] Extra attributes.
 * @returns {string}
 */
export function toastRegion({ children = '', class: className = '', attrs: extra = {} } = {}) {
  return `<div class="${cx('kit-toast__region', className)}" role="region"${attrs(extra)}>${children}</div>`;
}
