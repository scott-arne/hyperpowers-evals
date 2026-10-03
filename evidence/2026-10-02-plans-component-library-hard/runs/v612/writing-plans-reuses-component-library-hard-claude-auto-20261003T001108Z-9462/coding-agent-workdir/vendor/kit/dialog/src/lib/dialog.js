import { esc } from '#kit/utils';

/**
 * Modal dialog. It stays closed until a control carrying
 * `data-dialog-open="<id>"` is clicked; public/kit.js opens it.
 *
 * @param {{id: string, title: string, body: string, actions?: string}} opts
 *   `body` and `actions` are trusted HTML.
 * @returns {string}
 */
export function dialog({ id, title, body, actions = '' }) {
  const foot = actions ? `<footer class="kit-dialog__actions">${actions}</footer>` : '';
  return `<dialog class="kit-dialog" id="${esc(id)}" aria-labelledby="${esc(id)}-title"><h2 class="kit-dialog__title" id="${esc(id)}-title">${esc(title)}</h2><div class="kit-dialog__body">${body}</div>${foot}<form method="dialog" class="kit-dialog__close"><button class="kit-btn kit-btn--ghost kit-btn--sm">Close</button></form></dialog>`;
}
