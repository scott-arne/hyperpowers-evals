/**
 * Box that keeps its content at a fixed aspect ratio.
 *
 * @param {{children: string, ratio?: number}} opts `children` is trusted HTML.
 * @returns {string}
 */
export function aspectRatio({ children, ratio = 16 / 9 }) {
  return `<div class="kit-aspect-ratio" style="aspect-ratio: ${Number(ratio) || 16 / 9}">${children}</div>`;
}
