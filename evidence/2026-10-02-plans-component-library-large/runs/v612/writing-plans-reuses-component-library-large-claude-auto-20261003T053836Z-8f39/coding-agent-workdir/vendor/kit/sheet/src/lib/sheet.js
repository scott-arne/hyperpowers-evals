import { attrs, cx } from '#kit/utils';

/**
 * Panel that slides in from an edge of the screen.
 *
 * @param {object} [opts]
 * @param {string} [opts.children] Trusted HTML.
 * @param {string} [opts.class] Extra class names.
 * @param {Record<string, string | boolean>} [opts.attrs] Extra attributes.
 * @returns {string}
 */
export function sheet({ children = '', class: className = '', attrs: extra = {} } = {}) {
  return `<div class="${cx('kit-sheet', className)}"${attrs(extra)}>${children}</div>`;
}
