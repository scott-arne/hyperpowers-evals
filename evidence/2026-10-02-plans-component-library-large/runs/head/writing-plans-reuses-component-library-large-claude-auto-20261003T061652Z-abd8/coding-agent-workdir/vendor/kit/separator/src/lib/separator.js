/**
 * Visual separator.
 *
 * @param {{orientation?: 'horizontal' | 'vertical'}} [opts]
 * @returns {string}
 */
export function separator({ orientation = 'horizontal' } = {}) {
  const o = orientation === 'vertical' ? 'vertical' : 'horizontal';
  return `<div class="kit-separator kit-separator--${o}" role="separator" aria-orientation="${o}"></div>`;
}
