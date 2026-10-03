import { attrs, esc } from '#kit/utils';

/**
 * Sidebar menu button, the link or button inside a menu entry.
 *  A link when `href` is given, otherwise a button.
 *
 * @param {object} opts
 * @param {string} opts.label
 * @param {string} [opts.href]
 * @param {boolean} [opts.disabled] For a button only.
 * @param {Record<string, string | boolean>} [opts.attrs] Extra attributes.
 * @returns {string}
 */
export function sidebarMenuButton({ label, href, disabled = false, attrs: extra = {} }) {
  if (href) return `<a class="kit-sidebar__menu-button" href="${esc(href)}"${attrs(extra)}>${esc(label)}</a>`;
  return `<button class="kit-sidebar__menu-button" type="button"${attrs({ ...extra, disabled })}>${esc(label)}</button>`;
}
