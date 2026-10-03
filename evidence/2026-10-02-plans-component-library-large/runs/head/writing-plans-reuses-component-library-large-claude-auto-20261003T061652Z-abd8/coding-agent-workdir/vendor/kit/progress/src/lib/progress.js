import { esc } from '#kit/utils';

/**
 * Progress bar.
 *
 * @param {{value: number, max?: number, label: string}} opts
 * @returns {string}
 */
export function progress({ value, max = 100, label }) {
  const pct = Math.max(0, Math.min(100, (Number(value) / Number(max)) * 100 || 0));
  return `<div class="kit-progress" role="progressbar" aria-label="${esc(label)}" aria-valuenow="${esc(value)}" aria-valuemin="0" aria-valuemax="${esc(max)}"><span class="kit-progress__indicator" style="width: ${pct.toFixed(1)}%"></span></div>`;
}
