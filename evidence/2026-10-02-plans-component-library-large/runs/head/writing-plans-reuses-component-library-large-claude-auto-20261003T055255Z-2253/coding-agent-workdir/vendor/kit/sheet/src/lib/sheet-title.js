import { cx, esc } from '#kit/utils';

/**
 * Sheet title.
 *
 * @param {{text: string, class?: string}} opts
 * @returns {string}
 */
export function sheetTitle({ text, class: className = '' }) {
  return `<h2 class="${cx('kit-sheet__title', className)}">${esc(text)}</h2>`;
}
