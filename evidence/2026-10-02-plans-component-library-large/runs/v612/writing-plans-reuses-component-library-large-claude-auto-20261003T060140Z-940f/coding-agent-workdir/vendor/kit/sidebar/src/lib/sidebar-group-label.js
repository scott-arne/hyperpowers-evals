import { cx, esc } from '#kit/utils';

/**
 * Sidebar group label.
 *
 * @param {{text: string, class?: string}} opts
 * @returns {string}
 */
export function sidebarGroupLabel({ text, class: className = '' }) {
  return `<div class="${cx('kit-sidebar__group-label', className)}">${esc(text)}</div>`;
}
