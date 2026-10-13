// Rib geometry (pure maths, no three.js). Units: the outline is in mm, world output in cm.

// Suiren rib, traced from Hario's product shot of a single rib (mm, 115 x 24).
// y runs along the rib from the base; x runs across it from the inner (filter) edge.
export const RIB = {
  L: 115, T: 2.4,          // length, thickness (mm)
  LEAN: 30,                // inner edge leans out 30°: the V60's 60° cone
  BASE_R: 0.6, BASE_H: 1.0, // where the inner edge starts (cm), inside the ring
  BEND_R0: 2.4, BEND_K: 0.14, // outside the ring the rib bends round a vertical axis (cm):
                             // seen from above each rib is a curved arc, as in the pinwheel shot
  SLOT_X0: 7.0, SLOT_X1: 10.6, SLOT_Y: 16, // the fork that clips onto the ring
};
// [y, inner x, outer x]
export const PROFILE = [
  [0, 1.5, 18.5], [1, 0.6, 19.5], [3.3, 0.4, 19.8], [7.6, 0.4, 19.9], [12, 0.4, 20.7], [16.4, 0.4, 21.4],
  [20.7, 0.4, 22.3], [25.1, 0.2, 22.9], [29.5, 0.2, 23.6], [33.8, 0.2, 24.0], [38.2, 0.2, 24.4], [42.5, 0.2, 24.5],
  [46.9, 0.2, 24.5], [51.3, 0, 24.2], [55.7, 0, 23.6], [60, 0, 22.9], [64.4, 0, 22.1], [68.8, -0.2, 21.2],
  [73.1, -0.4, 19.9], [77.5, -0.7, 18.3], [81.9, -0.9, 16.6], [86.2, -1.3, 14.6], [90.6, -1.7, 12.7],
  [95, -2.2, 10.3], [99.3, -2.8, 7.9], [103.7, -3.7, 5.2], [108, -4.6, 2.4], [112.4, -5.9, -0.7], [115, -6.6, -6.2],
];
function profileAt(y) {
  let i = 0;
  while (i < PROFILE.length - 2 && PROFILE[i + 1][0] < y) i++;
  const [y0, a0, b0] = PROFILE[i], [y1, a1, b1] = PROFILE[i + 1];
  const t = Math.min(1, Math.max(0, (y - y0) / (y1 - y0)));
  return [a0 + (a1 - a0) * t, b0 + (b1 - b0) * t];
}
export function smooth01(e0, e1, x) { const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0))); return t * t * (3 - 2 * t); }
export const D2R = Math.PI / 180;

// local (mm) -> world (cm) for the rib at angle 0; side = +1 / -1 picks the face.
// World: x = tangential, y = up, z = radial.
export function ribToWorld(x, y, side) {
  const l = RIB.LEAN * D2R, c = Math.cos(l), s = Math.sin(l);
  const H = RIB.BASE_H + (y * c - x * s) / 10;
  const R = RIB.BASE_R + (y * s + x * c) / 10;
  const d = Math.max(0, R - RIB.BEND_R0);
  const bend = RIB.BEND_K * d * d, slope = 2 * RIB.BEND_K * d;
  const nl = Math.hypot(1, slope);
  const off = side * RIB.T / 20;                       // half thickness, cm
  return [bend + off / nl, H, R - off * slope / nl];
}

export function buildRibArrays() {
  const pos = [], edge = [], idx = [];
  const add = (v, e) => { pos.push(v[0], v[1], v[2]); edge.push(e); return pos.length / 3 - 1; };
  const quad = (a, b, c, d) => idx.push(a, b, c, a, c, d);

  // a patch is a grid of local points: rows (y), columns spanning [xa(y), xb(y)]
  function patch(ys, xa, xb, nc) {
    return ys.map(y => { const a = xa(y), b = xb(y); return Array.from({ length: nc + 1 }, (_, j) => [a + (b - a) * j / nc, y]); });
  }
  function faces(P) {
    for (const side of [1, -1]) {
      const id = P.map(row => row.map(([x, y]) => add(ribToWorld(x, y, side), 0)));
      for (let i = 0; i < P.length - 1; i++) for (let j = 0; j < P[0].length - 1; j++) {
        if (side > 0) quad(id[i][j], id[i + 1][j], id[i + 1][j + 1], id[i][j + 1]);
        else quad(id[i][j], id[i][j + 1], id[i + 1][j + 1], id[i + 1][j]);
      }
    }
  }
  // side wall along a polyline of local points
  function wall(line) {
    for (let k = 0; k < line.length - 1; k++) {
      const [x0, y0] = line[k], [x1, y1] = line[k + 1];
      const a = add(ribToWorld(x0, y0, 1), 1), b = add(ribToWorld(x0, y0, -1), 1);
      const c = add(ribToWorld(x1, y1, -1), 1), d = add(ribToWorld(x1, y1, 1), 1);
      quad(a, b, c, d);
    }
  }
  const range = (a, b, n) => Array.from({ length: n + 1 }, (_, i) => a + (b - a) * i / n);
  const { SLOT_X0: s0, SLOT_X1: s1, SLOT_Y: sy } = RIB;
  const inner = y => profileAt(y)[0], outer = y => profileAt(y)[1];

  // below the slot top: inner prong and outer part
  const yLow = range(0, sy, 16);
  const A = patch(yLow, inner, () => s0, 3);
  const B = patch(yLow, () => s1, outer, 6);
  // above: full width, columns split at the slot edges' share of the width
  const [i0, o0] = profileAt(sy);
  const f0 = (s0 - i0) / (o0 - i0), f1 = (s1 - i0) / (o0 - i0);
  const yHigh = range(sy, RIB.L, 90);
  const split = (y, f) => { const [a, b] = profileAt(y); return a + (b - a) * f; };
  const C1 = patch(yHigh, inner, y => split(y, f0), 3);
  const C2 = patch(yHigh, y => split(y, f0), y => split(y, f1), 2);
  const C3 = patch(yHigh, y => split(y, f1), outer, 6);
  [A, B, C1, C2, C3].forEach(faces);

  const col = (P, j) => P.map(r => r[j]);
  const last = P => P[0].length - 1;
  wall(col(A, 0).concat(col(C1, 0).slice(1)));                  // inner (filter) edge
  wall(col(B, last(B)).concat(col(C3, last(C3)).slice(1)));     // outer edge
  wall(A[0]); wall(B[0]);                                       // base
  wall(col(A, last(A))); wall(col(B, 0));                       // slot sides
  wall(C2[0]);                                                  // slot top
  return { pos, edge, idx };
}

