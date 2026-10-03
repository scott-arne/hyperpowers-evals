import { attrs, esc } from '#kit/utils';

/**
 * Context menu item with a check state.
 *
 * @param {{label: string, checked?: boolean, attrs?: Record<string, string | boolean>}} opts
 * @returns {string}
 */
export function contextMenuCheckboxItem({ label, checked = false, attrs: extra = {} }) {
  return `<button class="kit-context-menu__checkbox-item" type="button" role="menuitemcheckbox" aria-checked="${checked}"${attrs(extra)}>${esc(label)}</button>`;
}
