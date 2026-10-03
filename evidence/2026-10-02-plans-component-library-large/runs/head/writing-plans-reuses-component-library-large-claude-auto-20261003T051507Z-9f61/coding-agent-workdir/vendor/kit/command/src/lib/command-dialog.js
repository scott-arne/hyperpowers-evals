import { attrs, cx } from '#kit/utils';

/**
 * Command dialog wrapper.
 *
 * @param {object} [opts]
 * @param {string} [opts.children] Trusted HTML.
 * @param {string} [opts.class] Extra class names.
 * @param {Record<string, string | boolean>} [opts.attrs] Extra attributes.
 * @returns {string}
 */
export function commandDialog({ children = '', class: className = '', attrs: extra = {} } = {}) {
  return `<div class="${cx('kit-command__dialog', className)}"${attrs(extra)}>${children}</div>`;
}
