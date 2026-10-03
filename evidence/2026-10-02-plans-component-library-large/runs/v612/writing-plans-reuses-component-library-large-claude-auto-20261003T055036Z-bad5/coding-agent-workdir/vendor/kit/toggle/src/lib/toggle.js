import { attrs, esc } from '#kit/utils';

/**
 * A two-state button. The pressed state is `aria-pressed`.
 *
 * @param {{label: string, pressed?: boolean, attrs?: Record<string, string | boolean>}} opts
 * @returns {string}
 */
export function toggle({ label, pressed = false, attrs: extra = {} }) {
  return `<button class="kit-toggle" type="button" aria-pressed="${pressed}"${attrs(extra)}>${esc(label)}</button>`;
}
