import { cx } from '#kit/utils';

/**
 * Input group icon slot.
 *
 * @param {{class?: string}} [opts]
 * @returns {string}
 */
export function inputGroupIcon({ class: className = '' } = {}) {
  return `<span class="${cx('kit-input-group__icon', className)}" aria-hidden="true"></span>`;
}
