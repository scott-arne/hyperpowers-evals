import { attrs, cx } from '#kit/utils';

/**
 * Menu that opens from a trigger. Built on `<details>`, so it opens without script.
 *
 * @param {object} opts
 * @param {string} opts.children Trusted HTML: the trigger first, then the content.
 * @param {boolean} [opts.open]
 * @param {string} [opts.class] Extra class names.
 * @param {Record<string, string | boolean>} [opts.attrs] Extra attributes.
 * @returns {string}
 */
export function dropdownMenu({ children, open = false, class: className = '', attrs: extra = {} }) {
  return `<details class="${cx('kit-dropdown-menu', className)}"${attrs({ ...extra, open })}>${children}</details>`;
}
