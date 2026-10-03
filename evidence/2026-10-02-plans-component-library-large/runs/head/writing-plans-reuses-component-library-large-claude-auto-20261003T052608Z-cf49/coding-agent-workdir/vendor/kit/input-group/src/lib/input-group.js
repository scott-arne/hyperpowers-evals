import { attrs, cx } from '#kit/utils';

/**
 * Input with addons, text or buttons attached at either end.
 *
 * @param {object} [opts]
 * @param {string} [opts.children] Trusted HTML.
 * @param {string} [opts.class] Extra class names.
 * @param {Record<string, string | boolean>} [opts.attrs] Extra attributes.
 * @returns {string}
 */
export function inputGroup({ children = '', class: className = '', attrs: extra = {} } = {}) {
  return `<div class="${cx('kit-input-group', className)}"${attrs(extra)}>${children}</div>`;
}
