import { esc } from '#kit/utils';

/**
 * Calendar previous and next month links.
 *
 * @param {{prevHref: string, nextHref: string}} opts
 * @returns {string}
 */
export function calendarNav({ prevHref, nextHref }) {
  return `<div class="kit-calendar__nav"><a href="${esc(prevHref)}" aria-label="Previous month">‹</a><a href="${esc(nextHref)}" aria-label="Next month">›</a></div>`;
}
