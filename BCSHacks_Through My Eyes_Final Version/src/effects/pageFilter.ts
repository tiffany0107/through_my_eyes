// Applies the same colour-blindness matrix to the HTML interface (menus, HUD, cards)
// using an SVG feColorMatrix, so the effect isn't limited to the 3D scene.
const SVG_NS = 'http://www.w3.org/2000/svg';
let matrixEl: SVGFEColorMatrixElement | null = null;

function ensure(): SVGFEColorMatrixElement {
  if (matrixEl) return matrixEl;
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('aria-hidden', 'true');
  svg.style.position = 'absolute';
  svg.style.width = '0';
  svg.style.height = '0';
  const filter = document.createElementNS(SVG_NS, 'filter');
  filter.id = 'cb-filter';
  filter.setAttribute('color-interpolation-filters', 'linearRGB');
  matrixEl = document.createElementNS(SVG_NS, 'feColorMatrix');
  matrixEl.setAttribute('type', 'matrix');
  filter.appendChild(matrixEl);
  svg.appendChild(filter);
  document.body.appendChild(svg);
  return matrixEl;
}

/** Pass a row-major 3x3 matrix, or null to remove the filter. */
export function setPageFilter(target: HTMLElement, m: number[] | null): void {
  if (!m) {
    target.style.filter = '';
    return;
  }
  const el = ensure();
  const v = [m[0], m[1], m[2], 0, 0, m[3], m[4], m[5], 0, 0, m[6], m[7], m[8], 0, 0, 0, 0, 0, 1, 0];
  el.setAttribute('values', v.map((n) => n.toFixed(5)).join(' '));
  target.style.filter = 'url(#cb-filter)';
}
