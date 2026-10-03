import { attrs, esc } from '#kit/utils';

/**
 * Menubar item.
 *  A link when `href` is given, otherwise a button.
 *
 * @param {object} opts
 * @param {string} opts.label
 * @param {string} [opts.href]
 * @param {boolean} [opts.disabled] For a button only.
 * @param {Record<string, string | boolean>} [opts.attrs] Extra attributes.
 * @returns {string}
 */
export function menubarItem({ label, href, disabled = false, attrs: extra = {} }) {
  if (href) return `<a class="kit-menubar__item" role="menuitem" href="${esc(href)}"${attrs(extra)}>${esc(label)}</a>`;
  return `<button class="kit-menubar__item" type="button" role="menuitem"${attrs({ ...extra, disabled })}>${esc(label)}</button>`;
}
