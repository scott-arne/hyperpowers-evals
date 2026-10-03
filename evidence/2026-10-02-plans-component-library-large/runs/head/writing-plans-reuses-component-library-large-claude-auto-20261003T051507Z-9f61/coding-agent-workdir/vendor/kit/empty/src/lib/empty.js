import { esc } from '#kit/utils';

/**
 * Placeholder for a list or panel with nothing to show.
 *
 * @param {{title: string, body?: string}} opts `body` is trusted HTML.
 * @returns {string}
 */
export function emptyState({ title, body = '' }) {
  const more = body ? `<div class="kit-empty__body">${body}</div>` : '';
  return `<div class="kit-empty"><p class="kit-empty__title">${esc(title)}</p>${more}</div>`;
}
