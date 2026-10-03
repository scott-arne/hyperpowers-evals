import { attrs, cx } from '#kit/utils';

/**
 * Floating panel anchored to its trigger. Built on `<details>`.
 *
 * @param {object} opts
 * @param {string} opts.children Trusted HTML: the trigger first, then the content.
 * @param {boolean} [opts.open]
 * @param {string} [opts.class] Extra class names.
 * @param {Record<string, string | boolean>} [opts.attrs] Extra attributes.
 * @returns {string}
 */
export function popover({ children, open = false, class: className = '', attrs: extra = {} }) {
  return `<details class="${cx('kit-popover', className)}"${attrs({ ...extra, open })}>${children}</details>`;
}
