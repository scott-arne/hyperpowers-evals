import { esc } from '#kit/utils';

/**
 * Transient notification.
 *
 * @param {{title: string, body?: string, tone?: 'info' | 'ok' | 'warn' | 'bad'}} opts
 * @returns {string}
 */
export function toast({ title, body = '', tone = 'info' }) {
  const more = body ? `<p class="kit-toast__body">${esc(body)}</p>` : '';
  return `<div class="kit-toast kit-toast--${esc(tone)}" role="status"><p class="kit-toast__title">${esc(title)}</p>${more}</div>`;
}
