import { cx, esc } from '#kit/utils';

/**
 * Site navigation with optional flyout panels.
 *
 * @param {{label: string, children: string, class?: string}} opts
 *   `children` is trusted HTML.
 * @returns {string}
 */
export function navigationMenu({ label, children, class: className = '' }) {
  return `<nav class="${cx('kit-navigation-menu', className)}" aria-label="${esc(label)}">${children}</nav>`;
}
