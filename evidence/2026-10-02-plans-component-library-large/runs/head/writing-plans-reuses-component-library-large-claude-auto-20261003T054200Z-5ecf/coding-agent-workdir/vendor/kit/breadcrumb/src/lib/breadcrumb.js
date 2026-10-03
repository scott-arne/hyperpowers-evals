import { cx, esc } from '#kit/utils';

/**
 * Breadcrumb trail.
 *
 * @param {{label: string, children: string, class?: string}} opts
 *   `children` is trusted HTML.
 * @returns {string}
 */
export function breadcrumb({ label, children, class: className = '' }) {
  return `<nav class="${cx('kit-breadcrumb', className)}" aria-label="${esc(label)}">${children}</nav>`;
}
