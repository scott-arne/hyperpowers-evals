import { attrs, esc } from '#kit/utils';

/**
 * Context menu item in a radio group.
 *
 * @param {{label: string, checked?: boolean, attrs?: Record<string, string | boolean>}} opts
 * @returns {string}
 */
export function contextMenuRadioItem({ label, checked = false, attrs: extra = {} }) {
  return `<button class="kit-context-menu__radio-item" type="button" role="menuitemradio" aria-checked="${checked}"${attrs(extra)}>${esc(label)}</button>`;
}
