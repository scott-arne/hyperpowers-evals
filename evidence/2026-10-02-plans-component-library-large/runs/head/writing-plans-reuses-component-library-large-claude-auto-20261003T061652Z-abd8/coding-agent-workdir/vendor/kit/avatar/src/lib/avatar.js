import { cx, esc } from '#kit/utils';

/**
 * User avatar: an image, or initials when there is none.
 *
 * @param {{name: string, src?: string, size?: 'sm' | 'md' | 'lg'}} opts
 * @returns {string}
 */
export function avatar({ name, src, size = 'md' }) {
  const initials = String(name)
    .split(/\s+/)
    .map((w) => w[0] ?? '')
    .join('')
    .slice(0, 2)
    .toUpperCase();
  const inner = src
    ? `<img class="kit-avatar__image" src="${esc(src)}" alt="${esc(name)}">`
    : `<span class="kit-avatar__fallback" aria-label="${esc(name)}">${esc(initials)}</span>`;
  return `<span class="${cx('kit-avatar', `kit-avatar--${size}`)}">${inner}</span>`;
}
