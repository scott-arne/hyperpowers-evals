import { attrs, cx } from '#kit/utils';

/**
 * Context menu content panel.
 *
 * @param {object} [opts]
 * @param {string} [opts.children] Trusted HTML.
 * @param {string} [opts.class] Extra class names.
 * @param {Record<string, string | boolean>} [opts.attrs] Extra attributes.
 * @returns {string}
 */
export function contextMenuContent({ children = '', class: className = '', attrs: extra = {} } = {}) {
  return `<div class="${cx('kit-context-menu__content', className)}" role="menu"${attrs(extra)}>${children}</div>`;
}
