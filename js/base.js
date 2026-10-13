// Ring and dripper holder (polypropylene), modelled on Hario's parts drawing. Units: cm.
import * as THREE from 'three';
import { N } from './data.js';
import { D2R, smooth01 } from './rib-geometry.js';

const lathe = (pts, seg = 96, phiStart = 0, phiLength = Math.PI * 2) =>
  new THREE.LatheGeometry(pts.map(([r, h]) => new THREE.Vector2(r, h)), seg, phiStart, phiLength);

// Ring profile, [radius, height]: a thin-walled cup with a narrow spout, then a 30° cone
// (the ribs' lean) whose wall runs through the ribs' fork slots. Wall centre line:
// r = 1.362 + (h - 0.56) * tan 30°, wall 0.14 thick.
const RING_LOWER = [
  [1.29, -0.45], [1.43, -0.45], [1.45, -0.41], [1.45, 0.52], [1.43, 0.56], [1.86, 1.3],
  [1.72, 1.3], [1.29, 0.56], [1.27, 0.52], [1.27, -0.41], [1.29, -0.45],
];
// Upper cone, split by 12 vertical slots the ribs pass through.
const CROWN = [[1.86, 1.3], [2.75, 2.84], [2.81, 2.87], [2.82, 2.93], [2.75, 2.97], [2.64, 2.94], [1.72, 1.3]];
const SLOT = 9 * D2R;      // slot width, as an angle
const SLOT_CENTER = 0;     // centred on each rib

// Holder: a flat, slightly egg-shaped plate. Its centre opening has 12 fingers that rest
// on the ring's cone, with gaps between them for the ribs.
const HOLDER = {
  a: 5.8, b: 4.5, shift: 0.3, egg: 0.16,          // outline: semi-axes, offset, egg-ness
  rIn: 2.1, rOut: 3.75,                           // finger tips / gap ends
  gap: 5.5 * D2R, gapCenter: 0.65 * D2R, soft: 1.5 * D2R,
  y: 1.42, thickness: 0.12, bevel: 0.05,
};

function buildRing(mat) {
  const group = new THREE.Group();
  group.add(new THREE.Mesh(lathe(RING_LOWER), mat));
  const capGeo = new THREE.ShapeGeometry(new THREE.Shape(CROWN.map(([r, h]) => new THREE.Vector2(r, h))));
  for (let i = 0; i < N; i++) {
    const a0 = (i / N) * Math.PI * 2 + SLOT_CENTER + SLOT / 2;
    const len = (Math.PI * 2) / N - SLOT;
    group.add(new THREE.Mesh(lathe(CROWN, 10, a0, len), mat));
    for (const phi of [a0, a0 + len]) {            // close the slot faces
      const cap = new THREE.Mesh(capGeo, mat);
      cap.rotation.y = phi - Math.PI / 2;
      group.add(cap);
    }
  }
  return group;
}

function buildHolder(mat) {
  const h = HOLDER;
  const outline = new THREE.Shape();
  const M = 160;
  for (let k = 0; k <= M; k++) {
    const t = (k / M) * Math.PI * 2;
    const x = h.a * Math.cos(t) + h.shift;
    const z = h.b * Math.sin(t) * (1 - h.egg * Math.cos(t));   // narrower towards +x
    k === 0 ? outline.moveTo(x, -z) : outline.lineTo(x, -z);
  }
  const hole = new THREE.Path();
  const K = 720, step = (Math.PI * 2) / N;
  for (let k = 0; k <= K; k++) {
    const phi = (k / K) * Math.PI * 2;
    let d = (((phi - h.gapCenter) % step) + step) % step; if (d > step / 2) d -= step;
    const g = 1 - smooth01(h.gap - h.soft, h.gap + h.soft, Math.abs(d));   // 1 inside a rib gap
    const r = h.rIn + (h.rOut - h.rIn) * g;
    const x = r * Math.sin(phi), y = -r * Math.cos(phi);
    k === 0 ? hole.moveTo(x, y) : hole.lineTo(x, y);
  }
  outline.holes.push(hole);
  const geo = new THREE.ExtrudeGeometry(outline, {
    depth: h.thickness, bevelEnabled: true, bevelThickness: h.bevel, bevelSize: h.bevel, bevelSegments: 3, curveSegments: 1,
  });
  const plate = new THREE.Mesh(geo, mat);
  plate.rotation.x = -Math.PI / 2;   // shape lies in x/z, extruded upwards
  plate.position.y = h.y;
  return plate;
}

// Adds ring + holder to the scene; returns a function that sets their colours.
export function addBase(scene) {
  const ringMat = new THREE.MeshStandardMaterial({ roughness: 0.5, metalness: 0, envMapIntensity: 0.55, side: THREE.DoubleSide });
  const holderMat = new THREE.MeshStandardMaterial({ roughness: 0.42, metalness: 0, envMapIntensity: 0.6, side: THREE.DoubleSide });
  scene.add(buildRing(ringMat), buildHolder(holderMat));
  return function setFinish(finish) {
    ringMat.color.setHex(finish.ring);
    holderMat.color.setHex(finish.holder);
  };
}
