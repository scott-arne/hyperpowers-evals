import { esc } from './escape.js';

/**
 * Content card.
 *
 * @param {{title: string, body: string, footer?: string}} opts `body` and
 *   `footer` are trusted HTML.
 * @returns {string}
 */
export function card({ title, body, footer = '' }) {
  const foot = footer ? `<footer class="ui-card__footer">${footer}</footer>` : '';
  return `<section class="ui-card"><h2 class="ui-card__title">${esc(title)}</h2><div class="ui-card__body">${body}</div>${foot}</section>`;
}
