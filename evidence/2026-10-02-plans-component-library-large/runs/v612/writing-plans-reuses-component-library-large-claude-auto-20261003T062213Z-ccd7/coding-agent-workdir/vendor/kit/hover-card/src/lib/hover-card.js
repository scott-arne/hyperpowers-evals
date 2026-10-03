import { attrs, cx } from '#kit/utils';

/**
 * Card shown when the trigger is hovered or focused.
 *
 * @param {object} opts
 * @param {string} opts.children Trusted HTML: the trigger first, then the content.
 * @param {boolean} [opts.open]
 * @param {string} [opts.class] Extra class names.
 * @param {Record<string, string | boolean>} [opts.attrs] Extra attributes.
 * @returns {string}
 */
export function hoverCard({ children, open = false, class: className = '', attrs: extra = {} }) {
  return `<details class="${cx('kit-hover-card', className)}"${attrs({ ...extra, open })}>${children}</details>`;
}
