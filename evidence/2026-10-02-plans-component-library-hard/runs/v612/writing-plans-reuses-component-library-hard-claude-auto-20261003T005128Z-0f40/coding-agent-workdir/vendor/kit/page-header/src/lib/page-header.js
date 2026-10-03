import { esc } from '#kit/utils';

/**
 * Page title row.
 *
 * @param {{title: string, subtitle?: string, actions?: string}} opts
 *   `actions` is trusted HTML.
 * @returns {string}
 */
export function pageHeader({ title, subtitle = '', actions = '' }) {
  const sub = subtitle ? `<p class="kit-muted">${esc(subtitle)}</p>` : '';
  const act = actions ? `<div class="kit-page-header__actions">${actions}</div>` : '';
  return `<header class="kit-page-header"><div><h1>${esc(title)}</h1>${sub}</div>${act}</header>`;
}
