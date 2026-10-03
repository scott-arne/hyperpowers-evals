import { attrs, cx } from '#kit/utils';

/**
 * A section that expands and collapses. Built on `<details>`.
 *
 * @param {object} opts
 * @param {string} opts.children Trusted HTML: the trigger first, then the content.
 * @param {boolean} [opts.open]
 * @param {string} [opts.class] Extra class names.
 * @param {Record<string, string | boolean>} [opts.attrs] Extra attributes.
 * @returns {string}
 */
export function collapsible({ children, open = false, class: className = '', attrs: extra = {} }) {
  return `<details class="${cx('kit-collapsible', className)}"${attrs({ ...extra, open })}>${children}</details>`;
}
