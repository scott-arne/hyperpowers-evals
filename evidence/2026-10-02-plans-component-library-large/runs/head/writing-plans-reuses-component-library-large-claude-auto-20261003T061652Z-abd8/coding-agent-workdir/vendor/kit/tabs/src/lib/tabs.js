import { esc } from '#kit/utils';

/**
 * A strip of tab links. The active tab gets `aria-current="page"`.
 *
 * @param {{label: string, items: Array<{href: string, label: string, active?: boolean}>}} opts
 * @returns {string}
 */
export function tabs({ label, items }) {
  const links = items
    .map((item) => {
      const current = item.active ? ' aria-current="page"' : '';
      return `<a class="kit-tabs__tab" href="${esc(item.href)}"${current}>${esc(item.label)}</a>`;
    })
    .join('');
  return `<nav class="kit-tabs" aria-label="${esc(label)}">${links}</nav>`;
}
