import { esc } from './escape.js';

/**
 * Placeholder for a list or panel with nothing to show.
 *
 * @param {{title: string, body?: string}} opts `body` is trusted HTML.
 * @returns {string}
 */
export function emptyState({ title, body = '' }) {
  const more = body ? `<div class="ui-empty__body">${body}</div>` : '';
  return `<div class="ui-empty"><p class="ui-empty__title">${esc(title)}</p>${more}</div>`;
}
