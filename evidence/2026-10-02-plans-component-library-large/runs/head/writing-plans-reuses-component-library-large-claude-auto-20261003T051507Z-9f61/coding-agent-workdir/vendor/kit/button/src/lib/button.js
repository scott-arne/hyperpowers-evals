import { attrs, cx, esc } from '#kit/utils';

const VARIANTS = new Set(['primary', 'secondary', 'ghost', 'link']);

/**
 * Button, or a link styled as one when `href` is given.
 *
 * @param {object} opts
 * @param {string} opts.label
 * @param {string} [opts.href]
 * @param {'primary' | 'secondary' | 'ghost' | 'link'} [opts.variant]
 * @param {'sm' | 'md'} [opts.size]
 * @param {'button' | 'submit'} [opts.type] For a `<button>` only.
 * @param {Record<string, string | boolean>} [opts.attrs] Extra attributes,
 *   such as `data-dialog-open`.
 * @returns {string}
 */
export function button({
  label,
  href,
  variant = 'primary',
  size = 'md',
  type = 'button',
  attrs: extra = {},
}) {
  const v = VARIANTS.has(variant) ? variant : 'primary';
  const cls = cx('kit-btn', `kit-btn--${v}`, size === 'sm' && 'kit-btn--sm');
  if (href) return `<a class="${cls}" href="${esc(href)}"${attrs(extra)}>${esc(label)}</a>`;
  const t = type === 'submit' ? 'submit' : 'button';
  return `<button class="${cls}" type="${t}"${attrs(extra)}>${esc(label)}</button>`;
}
