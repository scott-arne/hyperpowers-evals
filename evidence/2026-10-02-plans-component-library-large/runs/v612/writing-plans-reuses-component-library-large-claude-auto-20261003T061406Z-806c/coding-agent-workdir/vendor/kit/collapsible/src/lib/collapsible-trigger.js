import { cx, esc } from '#kit/utils';

/**
 * Collapsible trigger, the control that opens it.
 *
 * @param {{label: string, class?: string}} opts
 * @returns {string}
 */
export function collapsibleTrigger({ label, class: className = '' }) {
  return `<summary class="${cx('kit-collapsible__trigger', className)}">${esc(label)}</summary>`;
}
