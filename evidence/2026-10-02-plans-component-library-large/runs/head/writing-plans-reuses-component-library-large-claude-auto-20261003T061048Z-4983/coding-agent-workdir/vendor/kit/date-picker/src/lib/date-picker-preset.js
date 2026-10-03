import { attrs, esc } from '#kit/utils';

/**
 * Date picker preset range.
 *  A link when `href` is given, otherwise a button.
 *
 * @param {object} opts
 * @param {string} opts.label
 * @param {string} [opts.href]
 * @param {boolean} [opts.disabled] For a button only.
 * @param {Record<string, string | boolean>} [opts.attrs] Extra attributes.
 * @returns {string}
 */
export function datePickerPreset({ label, href, disabled = false, attrs: extra = {} }) {
  if (href) return `<a class="kit-date-picker__preset" href="${esc(href)}"${attrs(extra)}>${esc(label)}</a>`;
  return `<button class="kit-date-picker__preset" type="button"${attrs({ ...extra, disabled })}>${esc(label)}</button>`;
}
