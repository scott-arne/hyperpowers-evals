import { esc } from '#kit/utils';

/**
 * A row of mutually exclusive link toggles, such as a view switch. The pressed
 * item gets `aria-pressed="true"`.
 *
 * @param {{label: string, items: Array<{href: string, label: string, pressed?: boolean}>}} opts
 * @returns {string}
 */
export function toggleGroup({ label, items }) {
  const links = items
    .map((item) => {
      const pressed = item.pressed ? 'true' : 'false';
      return `<a class="kit-toggle" role="button" href="${esc(item.href)}" aria-pressed="${pressed}">${esc(item.label)}</a>`;
    })
    .join('');
  return `<div class="kit-toggle-group" role="group" aria-label="${esc(label)}">${links}</div>`;
}
