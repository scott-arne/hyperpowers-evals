import { esc } from './escape.js';

/**
 * Page title row.
 *
 * @param {{title: string, subtitle?: string, actions?: string}} opts
 *   `actions` is trusted HTML.
 * @returns {string}
 */
export function pageHeader({ title, subtitle = '', actions = '' }) {
  const sub = subtitle ? `<p class="ui-muted">${esc(subtitle)}</p>` : '';
  const act = actions ? `<div class="ui-page-header__actions">${actions}</div>` : '';
  return `<header class="ui-page-header"><div><h1>${esc(title)}</h1>${sub}</div>${act}</header>`;
}
