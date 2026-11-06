// A real 3D laptop for the hero: beveled aluminium body, individual keys,
// a glass screen showing Atrium, and a lid that swings open on its hinge as you scroll.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const stage = document.getElementById('stage');
const canvas = document.getElementById('laptop3d');
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
} catch {
  stage.classList.add('no-webgl');
  throw new Error('WebGL unavailable');
}
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;

const scene = new THREE.Scene();
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

const camera = new THREE.PerspectiveCamera(26, 1, 0.1, 100);

// ---------- dimensions (roughly a 14" laptop, 1 unit ≈ 10 cm) ----------
const W = 3.1, D = 2.16, T = 0.07;       // base width, depth, thickness
const LH = 2.02, LT = 0.045;             // lid height, thickness
const SW = 2.86, SH = SW / 1.6;          // screen, 16:10 like the screenshot

// ---------- materials ----------
const aluminium = new THREE.MeshPhysicalMaterial({ color: 0x2c2d32, metalness: 0.92, roughness: 0.36, clearcoat: 0.25, clearcoatRoughness: 0.4, envMapIntensity: 0.85 });
const aluminiumEdge = new THREE.MeshPhysicalMaterial({ color: 0x4a4c53, metalness: 1, roughness: 0.2 });
const keyMat = new THREE.MeshStandardMaterial({ color: 0x08080a, metalness: 0.05, roughness: 0.7, envMapIntensity: 0.25 });
const wellMat = new THREE.MeshStandardMaterial({ color: 0x17181b, metalness: 0.6, roughness: 0.5 });
const padMat = new THREE.MeshPhysicalMaterial({ color: 0x34353a, metalness: 0.75, roughness: 0.18, clearcoat: 1, clearcoatRoughness: 0.08 });
const glassMat = new THREE.MeshPhysicalMaterial({ color: 0x050506, metalness: 0, roughness: 0.06, clearcoat: 1, clearcoatRoughness: 0.03 });
const hingeMat = new THREE.MeshStandardMaterial({ color: 0x141518, metalness: 0.7, roughness: 0.4 });

function roundedSlab(w, d, depth, r, bevel) {
  const s = new THREE.Shape();
  const x = -w / 2, y = -d / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + d - r); s.quadraticCurveTo(x + w, y + d, x + w - r, y + d);
  s.lineTo(x + r, y + d); s.quadraticCurveTo(x, y + d, x, y + d - r);
  s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
  return new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 5, curveSegments: 24 });
}

const laptop = new THREE.Group();
scene.add(laptop);

// ---------- base ----------
const baseGeo = roundedSlab(W, D, T, 0.13, 0.016);
baseGeo.rotateX(-Math.PI / 2);               // lie flat: depth becomes +Y
baseGeo.translate(0, 0, D / 2);              // back edge (hinge) at z = 0, front toward camera
const base = new THREE.Mesh(baseGeo, [aluminium, aluminiumEdge]);
laptop.add(base);
const top = T + 0.016;

// keyboard well
const well = new THREE.Mesh(new RoundedBoxGeometry(2.74, 0.004, 1.2, 2, 0.002), wellMat);
well.position.set(0, top + 0.001, 0.84);
laptop.add(well);

// keys: function row (half height), four full rows, bottom row with a long space bar
const pitch = 0.192, keySize = 0.168;
const keyGeo = new RoundedBoxGeometry(1, 0.022, 1, 2, 0.008);
const layout = [
  { z: 0.33, h: 0.5, keys: Array(14).fill(1) },
  { z: 0.5, keys: Array(14).fill(1) },
  { z: 0.5 + pitch, keys: [1.5, ...Array(12).fill(1), 1.5] },
  { z: 0.5 + pitch * 2, keys: [1.8, ...Array(11).fill(1), 2.2] },
  { z: 0.5 + pitch * 3, keys: [2.3, ...Array(10).fill(1), 2.7] },
  { z: 0.5 + pitch * 4, keys: [1, 1, 1, 1.25, 5.5, 1.25, 1, 1, 1] },
];
const placements = [];
for (const row of layout) {
  const total = row.keys.reduce((a, b) => a + b, 0);
  let x = -(total * pitch) / 2;
  for (const k of row.keys) {
    placements.push({ x: x + (k * pitch) / 2, z: row.z, w: k * pitch - (pitch - keySize), d: keySize * (row.h || 1) });
    x += k * pitch;
  }
}
const keys = new THREE.InstancedMesh(keyGeo, keyMat, placements.length);
const m = new THREE.Matrix4();
placements.forEach((p, i) => {
  m.compose(new THREE.Vector3(p.x, top + 0.012, p.z), new THREE.Quaternion(), new THREE.Vector3(p.w, 1, p.d));
  keys.setMatrixAt(i, m);
});
laptop.add(keys);

// trackpad
const pad = new THREE.Mesh(new RoundedBoxGeometry(1.28, 0.006, 0.66, 3, 0.003), padMat);
pad.position.set(0, top + 0.001, 1.79);
laptop.add(pad);

// hinge barrel
const hinge = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, W - 0.5, 24), hingeMat);
hinge.rotation.z = Math.PI / 2;
hinge.position.set(0, top - 0.005, -0.01);
laptop.add(hinge);

// ---------- lid (pivots at the hinge) ----------
const lid = new THREE.Group();
lid.position.set(0, top, 0);
laptop.add(lid);

const lidGeo = roundedSlab(W, LH, LT, 0.13, 0.012);
lidGeo.translate(0, LH / 2 + 0.03, -LT - 0.012);  // front face at z = 0, hinge at the bottom edge
lid.add(new THREE.Mesh(lidGeo, [aluminium, aluminiumEdge]));

const bezel = new THREE.Mesh(new RoundedBoxGeometry(W - 0.04, LH - 0.04, 0.004, 3, 0.002), glassMat);
bezel.position.set(0, LH / 2 + 0.03, 0.002);
lid.add(bezel);

const screenTex = new THREE.TextureLoader().load('assets/hero.jpg', () => requestRender());
screenTex.colorSpace = THREE.SRGBColorSpace;
screenTex.anisotropy = renderer.capabilities.getMaxAnisotropy();
const screen = new THREE.Mesh(
  new THREE.PlaneGeometry(SW, SH),
  new THREE.MeshBasicMaterial({ map: screenTex, toneMapped: false })
);
screen.position.set(0, 0.03 + 0.12 + SH / 2, 0.0045);
lid.add(screen);

// glass glare over the screen so it reads as a real display
const glare = new THREE.Mesh(
  new THREE.PlaneGeometry(SW, SH),
  new THREE.MeshPhysicalMaterial({ color: 0x000000, transparent: true, opacity: 0.18, roughness: 0.05, metalness: 0, clearcoat: 1, depthWrite: false })
);
glare.position.copy(screen.position).add(new THREE.Vector3(0, 0, 0.001));
lid.add(glare);

// ---------- soft contact shadow ----------
const sc = document.createElement('canvas');
sc.width = sc.height = 256;
const g = sc.getContext('2d');
const grad = g.createRadialGradient(128, 128, 10, 128, 128, 128);
grad.addColorStop(0, 'rgba(0,0,0,0.75)');
grad.addColorStop(0.55, 'rgba(0,0,0,0.35)');
grad.addColorStop(1, 'rgba(0,0,0,0)');
g.fillStyle = grad; g.fillRect(0, 0, 256, 256);
const shadow = new THREE.Mesh(new THREE.PlaneGeometry(W * 1.5, D * 1.6), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(sc), transparent: true, depthWrite: false }));
shadow.rotation.x = -Math.PI / 2;
shadow.position.set(0, -0.02, D / 2);
laptop.add(shadow);

// a key light for a crisp highlight along the edges
const key = new THREE.DirectionalLight(0xffffff, 1.4);
key.position.set(-3, 6, 5);
scene.add(key);
scene.add(new THREE.AmbientLight(0xffffff, 0.15));

// centre the model on its middle so it scales around itself
laptop.position.set(0, -0.55, -D / 2 + 0.2);

// ---------- scroll + pointer driven pose ----------
const lerp = (a, b, t) => a + (b - a) * t;
const ease = (t) => 1 - Math.pow(1 - t, 2.4);
let target = 0, current = 0, mx = 0, my = 0, cmx = 0, cmy = 0;

function progress() {
  const vh = innerHeight;
  return reduced ? 1 : Math.min(1, Math.max(0, scrollY / (vh * 0.7)));
}

function pose(p) {
  const e = ease(p);
  // lid: nearly closed and tilted toward you → open, leaning back a touch
  lid.rotation.x = THREE.MathUtils.degToRad(lerp(36, -14, e));
  // camera: looking down at the keyboard → straight on to the screen
  camera.position.set(cmx * 0.6, lerp(3.7, 1.55, e) + cmy * 0.3, lerp(7.6, 6.5, e));
  camera.lookAt(0, lerp(-0.75, 0.62, e), 0);
  laptop.rotation.y = lerp(-0.06, 0, e) + cmx * 0.05;
}

function resize() {
  const w = stage.clientWidth, h = stage.clientHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  // keep the laptop roughly the same width on narrow screens
  camera.fov = w < 700 ? 40 : w < 1100 ? 31 : 26;
  camera.updateProjectionMatrix();
  requestRender();
}

let needs = true, visible = true;
function requestRender() { needs = true; }

function frame() {
  requestAnimationFrame(frame);
  if (!visible) return;
  target = progress();
  current += (target - current) * (reduced ? 1 : 0.12);
  cmx += (mx - cmx) * 0.06; cmy += (my - cmy) * 0.06;
  const moving = Math.abs(target - current) > 0.0005 || Math.abs(mx - cmx) > 0.001 || Math.abs(my - cmy) > 0.001;
  if (!moving && !needs) return;
  needs = false;
  pose(current);
  renderer.render(scene, camera);
}

addEventListener('resize', resize);
addEventListener('pointermove', (e) => {
  if (reduced) return;
  mx = (e.clientX / innerWidth - 0.5) * 2;
  my = (e.clientY / innerHeight - 0.5) * 2;
}, { passive: true });
new IntersectionObserver(([en]) => { visible = en.isIntersecting; if (visible) requestRender(); }).observe(stage);

resize();
current = target = progress();
stage.classList.add('ready');
requestAnimationFrame(frame);
