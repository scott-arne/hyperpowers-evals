import { esc } from '#kit/utils';

/**
 * Range slider.
 *
 * @param {{name: string, label: string, value?: number, min?: number, max?: number, step?: number}} opts
 * @returns {string}
 */
export function slider({ name, label, value = 0, min = 0, max = 100, step = 1 }) {
  return `<input class="kit-slider" type="range" name="${esc(name)}" aria-label="${esc(label)}" value="${esc(value)}" min="${esc(min)}" max="${esc(max)}" step="${esc(step)}">`;
}
