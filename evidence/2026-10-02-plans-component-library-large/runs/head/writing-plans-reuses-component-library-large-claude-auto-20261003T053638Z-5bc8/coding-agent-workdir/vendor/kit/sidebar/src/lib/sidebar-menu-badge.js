import { cx, esc } from '#kit/utils';

/**
 * Sidebar count or status at the end of a menu entry.
 *
 * @param {{text: string, class?: string}} opts
 * @returns {string}
 */
export function sidebarMenuBadge({ text, class: className = '' }) {
  return `<span class="${cx('kit-sidebar__menu-badge', className)}">${esc(text)}</span>`;
}
