import { attrs, cx } from '#kit/utils';

/**
 * Menu for a region, opened from its trigger area.
 *
 * @param {object} opts
 * @param {string} opts.children Trusted HTML: the trigger first, then the content.
 * @param {boolean} [opts.open]
 * @param {string} [opts.class] Extra class names.
 * @param {Record<string, string | boolean>} [opts.attrs] Extra attributes.
 * @returns {string}
 */
export function contextMenu({ children, open = false, class: className = '', attrs: extra = {} }) {
  return `<details class="${cx('kit-context-menu', className)}"${attrs({ ...extra, open })}>${children}</details>`;
}
