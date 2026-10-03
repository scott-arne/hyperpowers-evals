import { attrs, cx } from '#kit/utils';

/**
 * Command group of related items.
 *
 * @param {object} [opts]
 * @param {string} [opts.children] Trusted HTML.
 * @param {string} [opts.class] Extra class names.
 * @param {Record<string, string | boolean>} [opts.attrs] Extra attributes.
 * @returns {string}
 */
export function commandGroup({ children = '', class: className = '', attrs: extra = {} } = {}) {
  return `<div class="${cx('kit-command__group', className)}" role="group"${attrs(extra)}>${children}</div>`;
}
