import { attrs, cx } from '#kit/utils';

/**
 * Tooltip content panel.
 *
 * @param {object} [opts]
 * @param {string} [opts.children] Trusted HTML.
 * @param {string} [opts.class] Extra class names.
 * @param {Record<string, string | boolean>} [opts.attrs] Extra attributes.
 * @returns {string}
 */
export function tooltipContent({ children = '', class: className = '', attrs: extra = {} } = {}) {
  return `<div class="${cx('kit-tooltip__content', className)}" role="tooltip"${attrs(extra)}>${children}</div>`;
}
