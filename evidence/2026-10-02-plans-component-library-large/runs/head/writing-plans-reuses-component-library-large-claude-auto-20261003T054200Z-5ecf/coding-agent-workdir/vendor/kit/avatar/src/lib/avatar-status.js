import { cx } from '#kit/utils';

/**
 * Avatar presence dot.
 *
 * @param {{class?: string}} [opts]
 * @returns {string}
 */
export function avatarStatus({ class: className = '' } = {}) {
  return `<span class="${cx('kit-avatar__status', className)}" aria-hidden="true"></span>`;
}
