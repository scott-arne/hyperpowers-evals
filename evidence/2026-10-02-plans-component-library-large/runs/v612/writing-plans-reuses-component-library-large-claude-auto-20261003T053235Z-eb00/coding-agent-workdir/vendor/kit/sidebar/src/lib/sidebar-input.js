import { attrs, esc } from '#kit/utils';

/**
 * Sidebar input.
 *
 * @param {object} opts
 * @param {string} opts.name
 * @param {string} [opts.value]
 * @param {string} [opts.placeholder]
 * @param {Record<string, string | boolean>} [opts.attrs] Extra attributes.
 * @returns {string}
 */
export function sidebarInput({ name, value = '', placeholder = '', attrs: extra = {} }) {
  return `<input class="kit-sidebar__input" type="text" name="${esc(name)}" value="${esc(value)}"${attrs({ placeholder: placeholder || false, ...extra })}>`;
}
