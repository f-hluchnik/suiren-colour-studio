// Resin look for the ribs. Each rib is drawn twice with the same geometry:
//
// 1. Filter pass (multiply blending): whatever is behind the rib is multiplied by its
//    tint. Multiplication is order-independent, so overlapping ribs mix correctly
//    without sorting (red over blue reads dark violet). Light travels further through
//    the resin at grazing angles and through the moulded edges, which darkens them.
// 2. Gloss pass (additive blending): Fresnel-weighted reflections of a few procedural
//    studio softboxes, plus a little internal scatter (strong for White).
//
// Reflected light is also taken out of the transmitted light, so ribs stay coloured.
// Both passes share the tint/fade uniforms, so updating one updates both.
import * as THREE from 'three';

const COMMON_VERT = `
  attribute float aEdge;
  varying vec3 vWN; varying vec3 vWP; varying float vE;
  void main() {
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vWP = wp.xyz;
    vWN = normalize(mat3(modelMatrix) * normal);
    vE = aEdge;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }`;
const FRESNEL = `
  float fresnel(float c) { return 0.045 + 0.955 * pow(1.0 - c, 5.0); }`;
const FILTER_FRAG = `
  uniform vec3 uTint; uniform float uFade; uniform float uEdge;
  varying vec3 vWN; varying vec3 vWP; varying float vE;
  ${FRESNEL}
  void main() {
    vec3 n = normalize(vWN); vec3 v = normalize(cameraPosition - vWP);
    float c = abs(dot(n, v));
    float path = mix(1.0, uEdge, vE) / max(c, 0.2);
    vec3 T = pow(max(uTint, vec3(0.002)), vec3(0.5 * path)) * (1.0 - 0.6 * fresnel(c));
    gl_FragColor = vec4(mix(vec3(1.0), T, uFade), 1.0);
  }`;
const SHINE_FRAG = `
  uniform vec3 uTint; uniform float uScatter; uniform float uFade; uniform float uHover;
  varying vec3 vWN; varying vec3 vWP; varying float vE;
  ${FRESNEL}
  float box(float x, float a, float b, float soft) { return smoothstep(a - soft, a, x) * (1.0 - smoothstep(b, b + soft, x)); }
  vec3 studio(vec3 r) {
    float az = atan(r.x, r.z);
    float key   = box(az, 0.55, 1.15, 0.12) * box(r.y, -0.05, 0.75, 0.12);    // big softbox, front right
    float strip = box(az, -1.45, -1.25, 0.05) * box(r.y, -0.30, 0.85, 0.10);  // tall strip, left
    float top   = pow(max(r.y, 0.0), 8.0);                                     // overhead
    return vec3(key * 1.9 + strip * 1.5 + top * 0.8 + 0.015);
  }
  void main() {
    vec3 n = normalize(vWN); vec3 v = normalize(cameraPosition - vWP);
    if (dot(n, v) < 0.0) n = -n;
    float c = clamp(dot(n, v), 0.0, 1.0);
    vec3 spec = studio(reflect(-v, n)) * fresnel(c) * 0.75;
    float lambert = 0.35 + 0.65 * max(dot(n, normalize(vec3(0.4, 0.8, 0.5))), 0.0);
    vec3 glow = uTint * (uScatter * lambert + 0.22 * uHover);
    gl_FragColor = vec4((spec + glow) * uFade, 1.0);
  }`;

export function makeRibMaterials(tint, scatter, edge) {
  const tintU = { value: new THREE.Vector3(...tint) };
  const fadeU = { value: 0 };
  const filter = new THREE.ShaderMaterial({
    uniforms: { uTint: tintU, uFade: fadeU, uEdge: { value: edge } },
    vertexShader: COMMON_VERT, fragmentShader: FILTER_FRAG,
    transparent: true, depthWrite: false, side: THREE.DoubleSide,
    blending: THREE.CustomBlending, blendEquation: THREE.AddEquation,
    blendSrc: THREE.DstColorFactor, blendDst: THREE.ZeroFactor,
  });
  const shine = new THREE.ShaderMaterial({
    uniforms: { uTint: tintU, uFade: fadeU, uScatter: { value: scatter }, uHover: { value: 0 } },
    vertexShader: COMMON_VERT, fragmentShader: SHINE_FRAG,
    transparent: true, depthWrite: false, side: THREE.DoubleSide,
    blending: THREE.CustomBlending, blendEquation: THREE.AddEquation,
    blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor,
  });
  return { filter, shine };
}

