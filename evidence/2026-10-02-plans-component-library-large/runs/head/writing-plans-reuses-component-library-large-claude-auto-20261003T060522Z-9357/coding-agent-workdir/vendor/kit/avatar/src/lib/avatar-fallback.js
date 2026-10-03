import { cx, esc } from '#kit/utils';

/**
 * Avatar initials, shown when there is no image.
 *
 * @param {{text: string, class?: string}} opts
 * @returns {string}
 */
export function avatarFallback({ text, class: className = '' }) {
  return `<span class="${cx('kit-avatar__fallback', className)}">${esc(text)}</span>`;
}
