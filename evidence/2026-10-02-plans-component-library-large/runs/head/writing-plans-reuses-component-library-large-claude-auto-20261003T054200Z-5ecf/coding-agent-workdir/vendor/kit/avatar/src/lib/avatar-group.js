import { attrs, cx } from '#kit/utils';

/**
 * Avatar group of related items.
 *
 * @param {object} [opts]
 * @param {string} [opts.children] Trusted HTML.
 * @param {string} [opts.class] Extra class names.
 * @param {Record<string, string | boolean>} [opts.attrs] Extra attributes.
 * @returns {string}
 */
export function avatarGroup({ children = '', class: className = '', attrs: extra = {} } = {}) {
  return `<div class="${cx('kit-avatar__group', className)}"${attrs(extra)}>${children}</div>`;
}
