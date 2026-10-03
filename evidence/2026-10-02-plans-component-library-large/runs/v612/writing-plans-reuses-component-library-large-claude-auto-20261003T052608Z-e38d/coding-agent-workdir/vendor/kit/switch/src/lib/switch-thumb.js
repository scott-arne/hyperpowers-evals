import { cx } from '#kit/utils';

/**
 * Switch thumb.
 *
 * @param {{class?: string}} [opts]
 * @returns {string}
 */
export function switchThumb({ class: className = '' } = {}) {
  return `<span class="${cx('kit-switch__thumb', className)}" aria-hidden="true"></span>`;
}
