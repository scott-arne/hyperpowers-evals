import { attrs, cx } from '#kit/utils';

/**
 * Hover card content panel.
 *
 * @param {object} [opts]
 * @param {string} [opts.children] Trusted HTML.
 * @param {string} [opts.class] Extra class names.
 * @param {Record<string, string | boolean>} [opts.attrs] Extra attributes.
 * @returns {string}
 */
export function hoverCardContent({ children = '', class: className = '', attrs: extra = {} } = {}) {
  return `<div class="${cx('kit-hover-card__content', className)}"${attrs(extra)}>${children}</div>`;
}
