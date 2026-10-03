import { cx, esc } from '#kit/utils';

/**
 * Sheet description.
 *
 * @param {{text: string, class?: string}} opts
 * @returns {string}
 */
export function sheetDescription({ text, class: className = '' }) {
  return `<p class="${cx('kit-sheet__description', className)}">${esc(text)}</p>`;
}
