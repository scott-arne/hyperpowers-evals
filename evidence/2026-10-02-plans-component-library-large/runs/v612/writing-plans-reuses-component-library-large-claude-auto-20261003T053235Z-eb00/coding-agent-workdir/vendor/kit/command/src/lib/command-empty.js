import { cx, esc } from '#kit/utils';

/**
 * Command message shown when nothing matches.
 *
 * @param {{text: string, class?: string}} opts
 * @returns {string}
 */
export function commandEmpty({ text, class: className = '' }) {
  return `<p class="${cx('kit-command__empty', className)}">${esc(text)}</p>`;
}
