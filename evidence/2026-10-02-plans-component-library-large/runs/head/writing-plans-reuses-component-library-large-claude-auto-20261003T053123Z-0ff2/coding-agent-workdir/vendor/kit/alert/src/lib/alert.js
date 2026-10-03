import { esc } from '#kit/utils';

const TONES = new Set(['info', 'ok', 'warn', 'bad']);

/**
 * Inline alert.
 *
 * @param {{title: string, body?: string, tone?: 'info' | 'ok' | 'warn' | 'bad'}} opts
 *   `body` is trusted HTML.
 * @returns {string}
 */
export function alert({ title, body = '', tone = 'info' }) {
  const t = TONES.has(tone) ? tone : 'info';
  const more = body ? `<div class="kit-alert__body">${body}</div>` : '';
  const role = t === 'bad' ? 'alert' : 'status';
  return `<div class="kit-alert kit-alert--${t}" role="${role}"><p class="kit-alert__title">${esc(title)}</p>${more}</div>`;
}
