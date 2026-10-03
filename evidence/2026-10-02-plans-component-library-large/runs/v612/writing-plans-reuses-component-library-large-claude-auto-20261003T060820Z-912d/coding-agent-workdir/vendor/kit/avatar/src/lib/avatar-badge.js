import { cx, esc } from '#kit/utils';

/**
 * Avatar badge.
 *
 * @param {{text: string, class?: string}} opts
 * @returns {string}
 */
export function avatarBadge({ text, class: className = '' }) {
  return `<span class="${cx('kit-avatar__badge', className)}">${esc(text)}</span>`;
}
