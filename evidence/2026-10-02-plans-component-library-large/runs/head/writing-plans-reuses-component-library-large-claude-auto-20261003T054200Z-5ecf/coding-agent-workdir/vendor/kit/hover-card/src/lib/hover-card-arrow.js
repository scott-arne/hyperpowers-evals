import { cx } from '#kit/utils';

/**
 * Hover card arrow pointing at the trigger.
 *
 * @param {{class?: string}} [opts]
 * @returns {string}
 */
export function hoverCardArrow({ class: className = '' } = {}) {
  return `<span class="${cx('kit-hover-card__arrow', className)}" aria-hidden="true"></span>`;
}
