import { attrs, cx } from '#kit/utils';

/**
 * Sheet portal target, rendered at the end of `<body>`.
 *
 * @param {object} [opts]
 * @param {string} [opts.children] Trusted HTML.
 * @param {string} [opts.class] Extra class names.
 * @param {Record<string, string | boolean>} [opts.attrs] Extra attributes.
 * @returns {string}
 */
export function sheetPortal({ children = '', class: className = '', attrs: extra = {} } = {}) {
  return `<div class="${cx('kit-sheet__portal', className)}"${attrs(extra)}>${children}</div>`;
}
