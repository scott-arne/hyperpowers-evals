import { esc } from './escape.js';

const TONES = new Set(['ok', 'warn', 'bad', 'info', 'muted']);

/**
 * Status chip. Map your domain's states to a tone at the call site.
 *
 * @param {string} label
 * @param {'ok' | 'warn' | 'bad' | 'info' | 'muted'} [tone]
 * @returns {string}
 */
export function statusChip(label, tone = 'muted') {
  const t = TONES.has(tone) ? tone : 'muted';
  return `<span class="ui-chip ui-chip--${t}">${esc(label)}</span>`;
}
