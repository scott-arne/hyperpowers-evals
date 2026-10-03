import { attrs, cx } from '#kit/utils';

/**
 * Command list.
 *
 * @param {object} [opts]
 * @param {string} [opts.children] Trusted HTML.
 * @param {string} [opts.class] Extra class names.
 * @param {Record<string, string | boolean>} [opts.attrs] Extra attributes.
 * @returns {string}
 */
export function commandList({ children = '', class: className = '', attrs: extra = {} } = {}) {
  return `<ul class="${cx('kit-command__list', className)}" role="listbox"${attrs(extra)}>${children}</ul>`;
}
