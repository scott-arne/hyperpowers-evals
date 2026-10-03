import { esc } from '#kit/utils';

/**
 * Avatar image.
 *
 * @param {{src: string, alt: string}} opts
 * @returns {string}
 */
export function avatarImage({ src, alt }) {
  return `<img class="kit-avatar__image" src="${esc(src)}" alt="${esc(alt)}">`;
}
