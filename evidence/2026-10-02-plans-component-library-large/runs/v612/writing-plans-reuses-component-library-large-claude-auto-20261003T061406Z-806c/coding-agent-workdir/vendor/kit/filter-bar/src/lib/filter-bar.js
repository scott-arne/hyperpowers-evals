import { esc } from '#kit/utils';

/**
 * A GET form for a page's filters. `fields` is trusted HTML, usually
 * `selectField` output; public/kit.js submits the form when a field marked
 * `data-autosubmit` changes. `keep` carries query state the bar should not
 * drop, such as the current sort.
 *
 * @param {object} opts
 * @param {string} opts.action
 * @param {string[]} opts.fields
 * @param {Record<string, string | undefined>} [opts.keep]
 * @returns {string}
 */
export function filterBar({ action, fields, keep = {} }) {
  const hidden = Object.entries(keep)
    .filter(([, v]) => v !== undefined && v !== '')
    .map(([k, v]) => `<input type="hidden" name="${esc(k)}" value="${esc(v)}">`)
    .join('');
  return `<form class="kit-filter-bar" method="get" action="${esc(action)}">${fields.join('')}${hidden}</form>`;
}
