import { attrs, esc } from '#kit/utils';

/**
 * Date picker end date field.
 *
 * @param {object} opts
 * @param {string} opts.name
 * @param {string} [opts.value]
 * @param {string} [opts.placeholder]
 * @param {Record<string, string | boolean>} [opts.attrs] Extra attributes.
 * @returns {string}
 */
export function datePickerRangeEnd({ name, value = '', placeholder = '', attrs: extra = {} }) {
  return `<input class="kit-date-picker__range-end" type="date" name="${esc(name)}" value="${esc(value)}"${attrs({ placeholder: placeholder || false, ...extra })}>`;
}
