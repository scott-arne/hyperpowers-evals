import { cx } from '#kit/utils';

/**
 * Sidebar placeholder entry shown while a menu loads.
 *
 * @param {{class?: string}} [opts]
 * @returns {string}
 */
export function sidebarMenuSkeleton({ class: className = '' } = {}) {
  return `<span class="${cx('kit-sidebar__menu-skeleton', className)}" aria-hidden="true"></span>`;
}
