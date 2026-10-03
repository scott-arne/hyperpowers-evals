import { attrs, cx } from '#kit/utils';

/**
 * Set of radio buttons.
 *
 * @param {object} [opts]
 * @param {string} [opts.children] Trusted HTML.
 * @param {string} [opts.class] Extra class names.
 * @param {Record<string, string | boolean>} [opts.attrs] Extra attributes.
 * @returns {string}
 */
export function radioGroup({ children = '', class: className = '', attrs: extra = {} } = {}) {
  return `<div class="${cx('kit-radio-group', className)}" role="radiogroup"${attrs(extra)}>${children}</div>`;
}
