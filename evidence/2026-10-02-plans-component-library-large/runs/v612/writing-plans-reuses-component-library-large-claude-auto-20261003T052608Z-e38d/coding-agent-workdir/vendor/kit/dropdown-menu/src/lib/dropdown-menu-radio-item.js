import { attrs, esc } from '#kit/utils';

/**
 * Dropdown menu item in a radio group.
 *
 * @param {{label: string, checked?: boolean, attrs?: Record<string, string | boolean>}} opts
 * @returns {string}
 */
export function dropdownMenuRadioItem({ label, checked = false, attrs: extra = {} }) {
  return `<button class="kit-dropdown-menu__radio-item" type="button" role="menuitemradio" aria-checked="${checked}"${attrs(extra)}>${esc(label)}</button>`;
}
