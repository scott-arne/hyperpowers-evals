import { esc } from '#kit/utils';

/**
 * Breadcrumb current page, the last entry.
 *
 * @param {{text: string}} opts
 * @returns {string}
 */
export function breadcrumbPage({ text }) {
  return `<span class="kit-breadcrumb__page" aria-current="page">${esc(text)}</span>`;
}
