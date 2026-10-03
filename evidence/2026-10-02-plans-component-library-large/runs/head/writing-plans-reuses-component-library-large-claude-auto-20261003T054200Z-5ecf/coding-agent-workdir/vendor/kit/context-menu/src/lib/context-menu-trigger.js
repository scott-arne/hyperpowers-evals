import { cx, esc } from '#kit/utils';

/**
 * Context menu trigger, the control that opens it.
 *
 * @param {{label: string, class?: string}} opts
 * @returns {string}
 */
export function contextMenuTrigger({ label, class: className = '' }) {
  return `<summary class="${cx('kit-context-menu__trigger', className)}">${esc(label)}</summary>`;
}
