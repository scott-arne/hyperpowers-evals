import { attrs, cx } from '#kit/utils';

/**
 * Stack of collapsible sections. Each item is a `<details>`.
 *
 * @param {object} [opts]
 * @param {string} [opts.children] Trusted HTML.
 * @param {string} [opts.class] Extra class names.
 * @param {Record<string, string | boolean>} [opts.attrs] Extra attributes.
 * @returns {string}
 */
export function accordion({ children = '', class: className = '', attrs: extra = {} } = {}) {
  return `<div class="${cx('kit-accordion', className)}"${attrs(extra)}>${children}</div>`;
}
