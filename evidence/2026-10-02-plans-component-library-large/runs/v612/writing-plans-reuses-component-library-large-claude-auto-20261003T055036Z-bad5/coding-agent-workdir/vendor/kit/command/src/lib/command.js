import { attrs, cx } from '#kit/utils';

/**
 * Command palette: a search input over a grouped list of actions.
 *
 * @param {object} [opts]
 * @param {string} [opts.children] Trusted HTML.
 * @param {string} [opts.class] Extra class names.
 * @param {Record<string, string | boolean>} [opts.attrs] Extra attributes.
 * @returns {string}
 */
export function command({ children = '', class: className = '', attrs: extra = {} } = {}) {
  return `<div class="${cx('kit-command', className)}"${attrs(extra)}>${children}</div>`;
}
