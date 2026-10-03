import { attrs, esc } from '#kit/utils';

/**
 * Menubar item that opens a submenu.
 *  A link when `href` is given, otherwise a button.
 *
 * @param {object} opts
 * @param {string} opts.label
 * @param {string} [opts.href]
 * @param {boolean} [opts.disabled] For a button only.
 * @param {Record<string, string | boolean>} [opts.attrs] Extra attributes.
 * @returns {string}
 */
export function menubarSubTrigger({ label, href, disabled = false, attrs: extra = {} }) {
  if (href) return `<a class="kit-menubar__sub-trigger" role="menuitem" href="${esc(href)}"${attrs(extra)}>${esc(label)}</a>`;
  return `<button class="kit-menubar__sub-trigger" type="button" role="menuitem"${attrs({ ...extra, disabled })}>${esc(label)}</button>`;
}
