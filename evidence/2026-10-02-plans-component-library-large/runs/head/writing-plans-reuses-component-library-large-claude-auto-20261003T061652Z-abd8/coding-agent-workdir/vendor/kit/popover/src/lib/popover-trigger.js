import { cx, esc } from '#kit/utils';

/**
 * Popover trigger, the control that opens it.
 *
 * @param {{label: string, class?: string}} opts
 * @returns {string}
 */
export function popoverTrigger({ label, class: className = '' }) {
  return `<summary class="${cx('kit-popover__trigger', className)}">${esc(label)}</summary>`;
}
