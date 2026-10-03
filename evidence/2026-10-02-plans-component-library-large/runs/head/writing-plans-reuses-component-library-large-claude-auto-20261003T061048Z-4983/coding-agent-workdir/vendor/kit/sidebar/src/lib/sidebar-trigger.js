import { attrs, cx, esc } from '#kit/utils';

/**
 * Sidebar trigger, the control that opens it.
 *
 * @param {object} opts
 * @param {string} opts.label
 * @param {string} [opts.controls] Id of the element it opens.
 * @param {string} [opts.class] Extra class names.
 * @param {Record<string, string | boolean>} [opts.attrs] Extra attributes.
 * @returns {string}
 */
export function sidebarTrigger({ label, controls, class: className = '', attrs: extra = {} }) {
  return `<button class="${cx('kit-sidebar__trigger', className)}" type="button"${attrs({ 'aria-controls': controls, ...extra })}>${esc(label)}</button>`;
}
