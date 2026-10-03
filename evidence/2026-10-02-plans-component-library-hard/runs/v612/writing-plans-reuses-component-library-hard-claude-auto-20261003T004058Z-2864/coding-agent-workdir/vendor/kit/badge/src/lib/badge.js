import { esc } from '#kit/utils';

const TONES = new Set(['ok', 'warn', 'bad', 'info', 'muted']);

/**
 * Status badge. Map your domain's states to a tone at the call site.
 *
 * @param {string} label
 * @param {'ok' | 'warn' | 'bad' | 'info' | 'muted'} [tone]
 * @returns {string}
 */
export function badge(label, tone = 'muted') {
  const t = TONES.has(tone) ? tone : 'muted';
  return `<span class="kit-badge kit-badge--${t}">${esc(label)}</span>`;
}
