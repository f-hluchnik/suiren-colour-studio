// The dial: the 12 ribs seen from above (front at the bottom), as SVG. Also used for
// the small preset thumbnails.
import { N, BY_ID, RINGS } from './data.js';
import { RIB } from './rib-geometry.js';

const SVGNS = 'http://www.w3.org/2000/svg';
const svgEl = (tag, attrs = {}) => {
  const el = document.createElementNS(SVGNS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  return el;
};

// One petal = a rib seen from above: straight inside the ring, then curving away with
// the same bend as the 3D ribs (world cm scaled to dial units). Points down (+y).
const PETAL = (() => {
  const U = 18.8, r0 = RIB.BEND_R0 * U, k = RIB.BEND_K / U;
  const R1 = 34, R2 = 130, M = 28;
  const centre = r => [k * Math.max(0, r - r0) ** 2, r];
  const left = [], right = [];
  for (let i = 0; i <= M; i++) {
    const r = R1 + (R2 - R1) * i / M;
    const [cx, cy] = centre(r), [nx, ny] = centre(r + 0.5);
    let tx = nx - cx, ty = ny - cy; const tl = Math.hypot(tx, ty); tx /= tl; ty /= tl;
    const hw = 2 + 7.5 * Math.pow(Math.sin(Math.PI * Math.min(1, (r - R1) / (R2 - R1 + 8))), 0.7);
    left.push([cx - ty * hw, cy + tx * hw]); right.push([cx + ty * hw, cy - tx * hw]);
  }
  const outline = left.concat(right.reverse());
  return 'M' + outline.map(([x, y]) => x.toFixed(1) + ' ' + y.toFixed(1)).join(' L') + ' Z';
})();
// Rib i sits at angle i/N around the ring, counter-clockwise seen from above.
const ribTransform = i => `rotate(${-(i / N) * 360})`;

const shade = (hex, f) => {
  const n = parseInt(hex.slice(1), 16);
  const ch = s => Math.round(((n >> s) & 255) * f).toString(16).padStart(2, '0');
  return '#' + ch(16) + ch(8) + ch(0);
};

/**
 * Builds the interactive dial inside `svg`.
 * @param {object} on  callbacks: paint(i), hover(i)
 * @returns {{ render(state), rotate(azimuthRadians) }}
 */
export function createDial(svg, on) {
  const turn = svgEl('g', { class: 'rot' });
  const ringDot = svgEl('circle', { r: 30, class: 'ring-dot', stroke: 'rgba(0,0,0,0.14)', 'stroke-width': 1.2 });
  const petals = [];
  for (let i = 0; i < N; i++) {
    const g = svgEl('g', { transform: ribTransform(i) });
    const p = svgEl('path', { d: PETAL, class: 'petal', tabindex: 0, role: 'button' });
    p.addEventListener('click', () => on.paint(i));
    p.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); on.paint(i); } });
    p.addEventListener('pointerenter', () => on.hover(i));
    p.addEventListener('pointerleave', () => on.hover(-1));
    p.addEventListener('focus', () => on.hover(i));
    p.addEventListener('blur', () => on.hover(-1));
    g.appendChild(p); turn.appendChild(g); petals.push(p);
  }
  const front = svgEl('text', { class: 'front', 'text-anchor': 'middle', y: 163 });
  front.textContent = 'front';   // the side of the dripper facing you
  svg.append(turn, ringDot, front);

  return {
    render(state) {
      petals.forEach((p, i) => {
        const c = BY_ID[state.ribs[i]];
        p.setAttribute('fill', c.hex); p.setAttribute('fill-opacity', '0.8');
        p.setAttribute('stroke', shade(c.hex, 0.72));
        p.setAttribute('aria-label', `Rib ${i + 1}, ${c.name}. Paint with ${BY_ID[state.brush].name}`);
        p.classList.toggle('hot', state.hover === i);
      });
      ringDot.setAttribute('fill', RINGS[state.ring].swatch);
    },
    // keep "front" at the bottom while the camera orbits
    rotate(az) { turn.setAttribute('transform', `rotate(${(az * 180) / Math.PI})`); },
  };
}

// Small static dial for preset buttons.
export function miniDial(ribIds, ringId) {
  const svg = svgEl('svg', { viewBox: '-140 -140 280 280', 'aria-hidden': 'true' });
  ribIds.forEach((id, i) => svg.appendChild(svgEl('path', {
    d: PETAL, transform: ribTransform(i), fill: BY_ID[id].hex, 'fill-opacity': 0.8,
  })));
  svg.appendChild(svgEl('circle', { r: 30, fill: RINGS[ringId].swatch, stroke: 'rgba(0,0,0,0.12)' }));
  return svg;
}
