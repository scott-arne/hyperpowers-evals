import { cx } from '#kit/utils';

/**
 * Command icon slot.
 *
 * @param {{class?: string}} [opts]
 * @returns {string}
 */
export function commandIcon({ class: className = '' } = {}) {
  return `<span class="${cx('kit-command__icon', className)}" aria-hidden="true"></span>`;
}
