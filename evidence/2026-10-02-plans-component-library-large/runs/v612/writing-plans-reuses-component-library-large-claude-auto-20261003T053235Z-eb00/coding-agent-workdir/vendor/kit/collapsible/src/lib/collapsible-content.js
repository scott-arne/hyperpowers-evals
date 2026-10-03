import { attrs, cx } from '#kit/utils';

/**
 * Collapsible content panel.
 *
 * @param {object} [opts]
 * @param {string} [opts.children] Trusted HTML.
 * @param {string} [opts.class] Extra class names.
 * @param {Record<string, string | boolean>} [opts.attrs] Extra attributes.
 * @returns {string}
 */
export function collapsibleContent({ children = '', class: className = '', attrs: extra = {} } = {}) {
  return `<div class="${cx('kit-collapsible__content', className)}"${attrs(extra)}>${children}</div>`;
}
