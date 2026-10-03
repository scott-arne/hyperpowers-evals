import { attrs, cx } from '#kit/utils';

/**
 * Date picker list of preset ranges.
 *
 * @param {object} [opts]
 * @param {string} [opts.children] Trusted HTML.
 * @param {string} [opts.class] Extra class names.
 * @param {Record<string, string | boolean>} [opts.attrs] Extra attributes.
 * @returns {string}
 */
export function datePickerPresets({ children = '', class: className = '', attrs: extra = {} } = {}) {
  return `<div class="${cx('kit-date-picker__presets', className)}"${attrs(extra)}>${children}</div>`;
}
