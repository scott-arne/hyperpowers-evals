import { attrs, cx } from '#kit/utils';

/**
 * Breadcrumb list.
 *
 * @param {object} [opts]
 * @param {string} [opts.children] Trusted HTML.
 * @param {string} [opts.class] Extra class names.
 * @param {Record<string, string | boolean>} [opts.attrs] Extra attributes.
 * @returns {string}
 */
export function breadcrumbList({ children = '', class: className = '', attrs: extra = {} } = {}) {
  return `<ol class="${cx('kit-breadcrumb__list', className)}"${attrs(extra)}>${children}</ol>`;
}
