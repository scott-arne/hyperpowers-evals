import { cx, esc } from '#kit/utils';

/**
 * Menubar label.
 *
 * @param {{text: string, class?: string}} opts
 * @returns {string}
 */
export function menubarLabel({ text, class: className = '' }) {
  return `<span class="${cx('kit-menubar__label', className)}">${esc(text)}</span>`;
}
