import { attrs, cx } from '#kit/utils';

/**
 * Accordion header.
 *
 * @param {object} [opts]
 * @param {string} [opts.children] Trusted HTML.
 * @param {string} [opts.class] Extra class names.
 * @param {Record<string, string | boolean>} [opts.attrs] Extra attributes.
 * @returns {string}
 */
export function accordionHeader({ children = '', class: className = '', attrs: extra = {} } = {}) {
  return `<div class="${cx('kit-accordion__header', className)}"${attrs(extra)}>${children}</div>`;
}
