import { attrs, cx } from '#kit/utils';

/**
 * Collapsible side navigation for an app shell.
 *
 * @param {object} [opts]
 * @param {string} [opts.children] Trusted HTML.
 * @param {string} [opts.class] Extra class names.
 * @param {Record<string, string | boolean>} [opts.attrs] Extra attributes.
 * @returns {string}
 */
export function sidebar({ children = '', class: className = '', attrs: extra = {} } = {}) {
  return `<aside class="${cx('kit-sidebar', className)}"${attrs(extra)}>${children}</aside>`;
}
