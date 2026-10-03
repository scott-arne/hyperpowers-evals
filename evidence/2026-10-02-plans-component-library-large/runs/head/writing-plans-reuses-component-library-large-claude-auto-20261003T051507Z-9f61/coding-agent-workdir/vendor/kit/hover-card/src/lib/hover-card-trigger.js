import { cx, esc } from '#kit/utils';

/**
 * Hover card trigger, the control that opens it.
 *
 * @param {{label: string, class?: string}} opts
 * @returns {string}
 */
export function hoverCardTrigger({ label, class: className = '' }) {
  return `<summary class="${cx('kit-hover-card__trigger', className)}">${esc(label)}</summary>`;
}
