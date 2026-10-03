import { esc } from '#kit/utils';

/**
 * Content card.
 *
 * @param {{title: string, body: string, footer?: string}} opts `body` and
 *   `footer` are trusted HTML.
 * @returns {string}
 */
export function card({ title, body, footer = '' }) {
  const foot = footer ? `<footer class="kit-card__footer">${footer}</footer>` : '';
  return `<section class="kit-card"><h2 class="kit-card__title">${esc(title)}</h2><div class="kit-card__body">${body}</div>${foot}</section>`;
}
