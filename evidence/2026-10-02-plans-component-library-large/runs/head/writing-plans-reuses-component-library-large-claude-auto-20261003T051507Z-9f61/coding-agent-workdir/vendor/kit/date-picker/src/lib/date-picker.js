import { attrs, cx } from '#kit/utils';

/**
 * Date or date-range field with a calendar popover and preset ranges.
 *
 * @param {object} opts
 * @param {string} opts.children Trusted HTML: the trigger first, then the content.
 * @param {boolean} [opts.open]
 * @param {string} [opts.class] Extra class names.
 * @param {Record<string, string | boolean>} [opts.attrs] Extra attributes.
 * @returns {string}
 */
export function datePicker({ children, open = false, class: className = '', attrs: extra = {} }) {
  return `<details class="${cx('kit-date-picker', className)}"${attrs({ ...extra, open })}>${children}</details>`;
}
