import { esc } from './escape.js';

/**
 * Labeled select. Inside a `filterBar`, changing it submits the bar's form.
 *
 * @param {object} opts
 * @param {string} opts.name Query parameter name.
 * @param {string} opts.label
 * @param {Array<{value: string, label: string}>} opts.options
 * @param {string} [opts.value] The selected value.
 * @returns {string}
 */
export function selectField({ name, label, options, value }) {
  const items = options
    .map((o) => {
      const selected = o.value === value ? ' selected' : '';
      return `<option value="${esc(o.value)}"${selected}>${esc(o.label)}</option>`;
    })
    .join('');
  return `<label class="ui-field"><span class="ui-field__label">${esc(label)}</span><select name="${esc(name)}" class="ui-select" data-autosubmit>${items}</select></label>`;
}
