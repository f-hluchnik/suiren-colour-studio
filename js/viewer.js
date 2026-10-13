// The 3D view: renderer, camera, lighting, the dripper, pointer picking and the render loop.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { N, BY_ID, RINGS } from './data.js';
import { buildRibArrays } from './rib-geometry.js';
import { makeRibMaterials } from './resin-material.js';
import { addBase } from './base.js';

// Framing. The dripper is ~12 cm tall; at this distance it fills about a third of the view.
const VIEW = { distance: 64, height: 14.5, target: [0, 4.6, 0], fov: 30, min: 16, max: 110 };

/**
 * @param {HTMLElement} stage   element the canvas fills
 * @param {object} state        shared app state (reads ribs, ring, hover)
 * @param {object} on           callbacks: hover(i), tap(i), turn(azimuthRadians)
 */
export function createViewer(stage, state, on) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  stage.prepend(renderer.domElement);

  const scene = new THREE.Scene();
  // The canvas must be opaque (the resin multiplies what is behind it): match the page.
  const mist = getComputedStyle(document.documentElement).getPropertyValue('--mist').trim();
  scene.background = new THREE.Color(mist || '#E4E8E5');
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.add(new THREE.HemisphereLight(0xffffff, 0xd4d8d5, 0.6));
  const key = new THREE.DirectionalLight(0xffffff, 1.4);
  key.position.set(6, 14, 10);
  scene.add(key);

  const camera = new THREE.PerspectiveCamera(VIEW.fov, 1, 0.1, 500);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true; controls.dampingFactor = 0.07;
  controls.minPolarAngle = 0.12; controls.maxPolarAngle = Math.PI * 0.62;
  controls.minDistance = VIEW.min; controls.maxDistance = VIEW.max; controls.enablePan = false;

  function resetView() {
    const aspect = stage.clientWidth / Math.max(1, stage.clientHeight);
    const k = aspect < 1 ? 1 / Math.max(aspect, 0.55) : 1;   // back off on tall screens
    camera.position.set(0, VIEW.height * k, VIEW.distance * k);
    controls.target.set(...VIEW.target);
    controls.update();
  }

  // soft contact shadow
  {
    const c = document.createElement('canvas'); c.width = c.height = 256;
    const g = c.getContext('2d');
    const grad = g.createRadialGradient(128, 128, 0, 128, 128, 128);
    grad.addColorStop(0, 'rgba(20,30,25,0.5)'); grad.addColorStop(0.4, 'rgba(20,30,25,0.2)'); grad.addColorStop(1, 'rgba(20,30,25,0)');
    g.fillStyle = grad; g.fillRect(0, 0, 256, 256);
    const shadow = new THREE.Mesh(new THREE.PlaneGeometry(14, 14),
      new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false, opacity: 0.35, toneMapped: false }));
    shadow.rotation.x = -Math.PI / 2; shadow.position.y = -0.47; shadow.renderOrder = 0;
    scene.add(shadow);
  }

  const setFinish = addBase(scene);
  const applyRing = () => setFinish(RINGS[state.ring]);

  // ribs: one shared geometry, two meshes (filter + gloss) per rib
  const ribGeo = new THREE.BufferGeometry();
  {
    const { pos, edge, idx } = buildRibArrays();
    ribGeo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    ribGeo.setAttribute('aEdge', new THREE.Float32BufferAttribute(edge, 1));
    ribGeo.setIndex(idx);
    ribGeo.computeVertexNormals();
  }
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const ribs = [];
  for (let i = 0; i < N; i++) {
    const col = BY_ID[state.ribs[i]];
    const m = makeRibMaterials(col.tint, col.scatter, col.edge);
    const filter = new THREE.Mesh(ribGeo, m.filter);
    filter.rotation.y = (i / N) * Math.PI * 2; filter.renderOrder = 1;
    const shine = new THREE.Mesh(ribGeo, m.shine);
    shine.rotation.y = filter.rotation.y; shine.renderOrder = 2;
    filter.userData.index = i;
    scene.add(filter, shine);
    ribs.push({ filter, mats: m, target: new THREE.Vector3(...col.tint), targetScatter: col.scatter, targetEdge: col.edge });
  }

  // Sets each rib's target colour; the render loop eases towards it.
  function applyRibs(instant = false) {
    ribs.forEach((r, i) => {
      const col = BY_ID[state.ribs[i]];
      r.target.set(...col.tint); r.targetScatter = col.scatter; r.targetEdge = col.edge;
      if (instant || reduceMotion) {
        r.mats.filter.uniforms.uTint.value.copy(r.target);
        r.mats.filter.uniforms.uEdge.value = col.edge;
        r.mats.shine.uniforms.uScatter.value = col.scatter;
      }
    });
  }

  // pointer: hover and tap-to-paint on the 3D ribs (a drag is an orbit, not a tap)
  const raycaster = new THREE.Raycaster(), ndc = new THREE.Vector2();
  const canvas = renderer.domElement;
  let down = null;
  function ribAt(e) {
    const rect = canvas.getBoundingClientRect();
    ndc.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    const hit = raycaster.intersectObjects(ribs.map(r => r.filter), false)[0];
    return hit ? hit.object.userData.index : -1;
  }
  canvas.addEventListener('pointerdown', e => { down = { x: e.clientX, y: e.clientY }; });
  canvas.addEventListener('pointerup', e => {
    if (down && Math.hypot(e.clientX - down.x, e.clientY - down.y) < 6) {
      const i = ribAt(e); if (i >= 0) on.tap(i);
    }
    down = null;
  });
  canvas.addEventListener('pointermove', e => {
    if (e.buttons) return;
    const i = ribAt(e);
    canvas.classList.toggle('over-rib', i >= 0);
    on.hover(i);
  });
  canvas.addEventListener('pointerleave', () => on.hover(-1));

  // render loop: ease colours and hover glow, stagger the ribs in on load
  const clock = new THREE.Clock(), start = performance.now();
  let lastAz = null;
  function frame() {
    const dt = Math.min(clock.getDelta(), 0.05);
    const k = 1 - Math.exp(-dt * 12);
    const t = performance.now() - start;
    ribs.forEach((r, i) => {
      const u = r.mats.filter.uniforms, s = r.mats.shine.uniforms;
      u.uTint.value.lerp(r.target, k);
      s.uScatter.value += (r.targetScatter - s.uScatter.value) * k;
      u.uEdge.value += (r.targetEdge - u.uEdge.value) * k;
      s.uHover.value += ((state.hover === i ? 1 : 0) - s.uHover.value) * k;
      const f = reduceMotion ? 1 : Math.min(1, Math.max(0, (t - 200 - i * 70) / 600));
      u.uFade.value = 1 - Math.pow(1 - f, 3);
    });
    controls.update();
    const az = controls.getAzimuthalAngle();
    if (lastAz === null || Math.abs(az - lastAz) > 0.002) { lastAz = az; on.turn(az); }
    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }

  function resize() {
    const w = stage.clientWidth, h = stage.clientHeight;
    renderer.setSize(w, h, false);
    canvas.style.width = '100%'; canvas.style.height = '100%';
    camera.aspect = w / Math.max(1, h); camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(stage);

  applyRing(); applyRibs(true); resize(); resetView();
  requestAnimationFrame(frame);

  return {
    applyRing, applyRibs, resetView,
    // renders a fresh frame and returns the canvas, for saving images
    snapshot() { renderer.render(scene, camera); return canvas; },
  };
}
