import { cx, esc } from '#kit/utils';

/**
 * Calendar day cell.
 *
 * @param {{date: string, selected?: boolean, outside?: boolean}} opts
 *   `date` is `YYYY-MM-DD`; `outside` marks days of the adjacent months.
 * @returns {string}
 */
export function calendarDay({ date, selected = false, outside = false }) {
  const day = Number(String(date).slice(8, 10));
  return `<button class="${cx('kit-calendar__day', outside && 'kit-calendar__day--outside')}" type="button" data-date="${esc(date)}" aria-pressed="${selected}">${day}</button>`;
}
