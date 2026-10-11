// Pilot model: data, 3D bust (creator + HUD portrait) and insignia art.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';

export const SUITS = ['#e8edf2', '#ff8a2a', '#2f6bff', '#c4202a', '#1f9e6a', '#8a4dff'];
export const VISORS = ['#ffb347', '#6fd3ff', '#ff4d6d', '#b8ff5a'];
export const HELMETS = ['AVIAN', 'AMPHIBIAN', 'INSECTOID'];   // species of the pilot model (pilot_0..2.glb)
export const INSIGNIA = [
  // simple vector emblems drawn on a 64x64 grid
  'M32 6 L58 32 L32 58 L6 32 Z M32 18 L46 32 L32 46 L18 32 Z',          // diamond
  'M32 4 L39 24 L60 24 L43 37 L49 58 L32 45 L15 58 L21 37 L4 24 L25 24 Z', // star
  'M8 40 Q32 4 56 40 L44 40 Q32 22 20 40 Z M24 46 L40 46 L32 60 Z',       // wing
  'M32 6 A26 26 0 1 0 32.1 6 Z M32 18 A14 14 0 1 1 31.9 18 Z',            // ring
  'M10 52 L32 8 L54 52 L42 52 L32 30 L22 52 Z',                           // chevron
  'M20 10 L44 10 L54 32 L44 54 L20 54 L10 32 Z M32 22 L40 32 L32 42 L24 32 Z', // hex
];
const CALLSIGNS = ['NOVA', 'VEGA', 'ORION', 'LYNX', 'ECHO', 'RAVEN', 'ATLAS', 'NYX', 'KESTREL', 'DRIFT'];

export function randomPilot() {
  const r = (n) => Math.floor(Math.random() * n);
  return { callsign: CALLSIGNS[r(CALLSIGNS.length)] + '-' + (10 + r(89)), helmet: r(3), suit: r(SUITS.length), visor: r(VISORS.length), insignia: r(INSIGNIA.length) };
}
export function cleanCallsign(s) { return String(s || '').toUpperCase().replace(/[^A-Z0-9 \-]/g, '').slice(0, 14).trim(); }

export function insigniaCanvas(index, color = '#ffffff', size = 128) {
  const c = document.createElement('canvas'); c.width = c.height = size;
  const g = c.getContext('2d');
  g.scale(size / 64, size / 64);
  g.fillStyle = color;
  g.fill(new Path2D(INSIGNIA[index]), 'evenodd');
  return c;
}
export function insigniaSvg(index) {
  return `<svg viewBox="0 0 64 64" aria-hidden="true"><path fill="currentColor" fill-rule="evenodd" d="${INSIGNIA[index]}"/></svg>`;
}

// ---------------------------------------------------------------- 3D bust
function shell(r, w, h, d, phi0, phiLen, th0, thLen, mat, seg = 48) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, seg, seg / 2, phi0, phiLen, th0, thLen), mat);
  m.scale.set(w, h, d); return m;
}
const FRONT = Math.PI / 2;   // SphereGeometry phi that faces +Z

export function buildBust(pilot) {
  const g = new THREE.Group();
  const suitCol = new THREE.Color(SUITS[pilot.suit]), visCol = new THREE.Color(VISORS[pilot.visor]);
  const suit = new THREE.MeshPhysicalMaterial({ color: suitCol, roughness: 0.32, metalness: 0.1, clearcoat: 0.8, clearcoatRoughness: 0.25 });
  const under = new THREE.MeshStandardMaterial({ color: 0x15181f, roughness: 0.7, metalness: 0.2 });           // flight-suit fabric
  const trim = new THREE.MeshStandardMaterial({ color: 0x2a2f38, roughness: 0.35, metalness: 0.85 });          // gunmetal trim
  const glow = new THREE.MeshBasicMaterial({ color: visCol, toneMapped: false });
  const visor = new THREE.MeshPhysicalMaterial({ color: 0x05070c, roughness: 0.04, metalness: 0.9, clearcoat: 1, sheen: 1, sheenColor: visCol, sheenRoughness: 0.25, emissive: visCol.clone().multiplyScalar(0.12) });

  // ---- torso: fabric body with sculpted armour on top
  const prof = [[0.0, -1.25], [0.27, -1.25], [0.3, -1.05], [0.36, -0.82], [0.42, -0.6], [0.44, -0.5], [0.4, -0.42], [0.26, -0.36], [0.13, -0.33], [0.0, -0.32]].map(([r, y]) => new THREE.Vector2(r, y));
  const body = new THREE.Mesh(new THREE.LatheGeometry(prof, 64), under); body.scale.set(1, 1, 0.6); g.add(body);
  const chest = shell(0.44, 1, 0.95, 0.64, FRONT - 1.2, 2.4, 0.3, 1.45, suit); chest.position.set(0, -0.66, 0.0); g.add(chest);
  const abs = shell(0.36, 1, 0.9, 0.62, FRONT - 0.75, 1.5, 1.45, 0.6, trim); abs.position.set(0, -0.78, 0.0); g.add(abs);
  // glowing panel lines on the chest plate
  for (const [x, y, w] of [[-0.14, -0.6, 0.12], [-0.14, -0.66, 0.08]]) { const l = new THREE.Mesh(new THREE.BoxGeometry(w, 0.012, 0.01), glow); l.position.set(x, y, 0.262); l.rotation.y = -0.18; g.add(l); }
  // insignia decal
  const tex = new THREE.CanvasTexture(insigniaCanvas(pilot.insignia, '#ffffff', 128)); tex.colorSpace = THREE.SRGBColorSpace;
  const decal = new THREE.Mesh(new THREE.PlaneGeometry(0.11, 0.11), new THREE.MeshBasicMaterial({ map: tex, transparent: true, color: visCol, toneMapped: false }));
  decal.position.set(0.14, -0.62, 0.262); decal.rotation.y = 0.2; g.add(decal);
  // layered pauldrons
  for (const sgn of [-1, 1]) {
    const p1 = shell(0.17, 1.05, 0.62, 1.0, 0, Math.PI * 2, 0, 1.35, suit); p1.position.set(sgn * 0.36, -0.43, 0); p1.rotation.z = -sgn * 0.75; g.add(p1);
    const p2 = shell(0.15, 1.0, 0.55, 0.95, 0, Math.PI * 2, 0, 1.4, trim); p2.position.set(sgn * 0.43, -0.53, 0); p2.rotation.z = -sgn * 1.0; g.add(p2);
    const pin = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.012, 0.012), glow); pin.position.set(sgn * 0.36, -0.4, 0.14); pin.rotation.z = -sgn * 0.75; g.add(pin);
    // thin harness strap following the chest curve
    const strap = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.012, 6, 32, 0.75), trim);
    strap.position.set(sgn * -0.1, -1.05, 0.1); strap.rotation.set(0.25, 0, sgn > 0 ? 1.35 : Math.PI - 1.35 - 0.75); g.add(strap);
  }
  // collar ring with a light line
  const collar = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.05, 16, 48), trim); collar.rotation.x = Math.PI / 2; collar.position.y = -0.31; g.add(collar);
  const collarGlow = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.008, 6, 64), glow); collarGlow.rotation.x = Math.PI / 2; collarGlow.position.set(0, -0.28, 0); g.add(collarGlow);
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.13, 0.16, 32), under); neck.position.y = -0.22; g.add(neck);

  // ---- helmets
  const head = new THREE.Group(); head.position.y = 0.0; g.add(head);
  const earCans = (y = -0.02, r = 0.075) => { for (const sgn of [-1, 1]) { const e = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.06, 32), trim); e.rotation.z = Math.PI / 2; e.position.set(sgn * 0.29, y, -0.02); head.add(e); const eg = new THREE.Mesh(new THREE.TorusGeometry(r * 0.75, 0.006, 6, 32), glow); eg.rotation.y = Math.PI / 2; eg.position.set(sgn * 0.322, y, -0.02); head.add(eg); } };
  if (pilot.helmet === 0) {          // VANGUARD: classic round fighter-pilot helmet, wide visor, crest, ear cans
    head.add(shell(0.29, 1, 1.07, 1.04, 0, Math.PI * 2, 0, Math.PI, suit, 64));
    head.add(shell(0.296, 1, 1.07, 1.05, FRONT - 1.0, 2.0, 1.12, 0.62, visor, 64));
    const crest = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.5), trim); crest.position.set(0, 0.3, -0.03); head.add(crest);
    const stripe = shell(0.299, 1, 1.07, 1.04, FRONT - 0.09, 0.18, 0.15, 0.9, glow, 64); head.add(stripe);
    earCans();
  } else if (pilot.helmet === 1) {   // RAPTOR: angular, swept fins, narrow glowing T-visor
    const sh = new THREE.Mesh(new THREE.IcosahedronGeometry(0.3, 2), suit.clone()); sh.material.flatShading = true; sh.scale.set(0.98, 1.08, 1.12); head.add(sh);
    const jaw = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.14, 0.24), trim); jaw.position.set(0, -0.17, 0.12); jaw.rotation.x = 0.3; head.add(jaw);
    const slit = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.05, 0.08), visor); slit.position.set(0, 0.02, 0.29); head.add(slit);
    const slitG = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.012, 0.01), glow); slitG.position.set(0, 0.02, 0.334); head.add(slitG);
    const tbar = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.14, 0.06), visor); tbar.position.set(0, -0.06, 0.3); head.add(tbar);
    for (const sgn of [-1, 1]) { const fin = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.12, 0.34), trim); fin.position.set(sgn * 0.17, 0.26, -0.1); fin.rotation.set(0.45, 0, sgn * 0.3); head.add(fin); }
  } else {                            // GHOST: smooth elongated shell, full wrap-around visor, antenna
    head.add(shell(0.29, 0.96, 1.18, 1.05, 0, Math.PI * 2, 0, Math.PI, suit, 64));
    head.add(shell(0.297, 0.96, 1.18, 1.06, FRONT - 1.1, 2.2, 1.05, 0.85, visor, 64));
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.283, 0.018, 8, 64), suit); band.rotation.x = Math.PI / 2; band.position.y = 0.1; band.scale.set(0.98, 1.08, 1); head.add(band);
    const bandG = new THREE.Mesh(new THREE.TorusGeometry(0.286, 0.005, 6, 64), glow); bandG.rotation.x = Math.PI / 2; bandG.position.y = 0.075; bandG.scale.set(0.98, 1.08, 1); head.add(bandG);
    const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.01, 0.28, 8), trim); ant.position.set(0.2, 0.3, -0.08); ant.rotation.z = -0.35; head.add(ant);
    const tip = new THREE.Mesh(new THREE.SphereGeometry(0.014, 12, 8), glow); tip.position.set(0.25, 0.43, -0.08); head.add(tip);
    earCans(-0.04, 0.06);
  }
  g.userData.head = head;

  // ---- holo pedestal
  const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.58, 0.06, 64), trim); ped.position.y = -1.29; g.add(ped);
  const pedRing = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.006, 6, 96), glow); pedRing.rotation.x = Math.PI / 2; pedRing.position.y = -1.255; g.add(pedRing);
  const scan = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.004, 6, 96), new THREE.MeshBasicMaterial({ color: visCol, transparent: true, opacity: 0.6, toneMapped: false }));
  scan.rotation.x = Math.PI / 2; scan.position.y = -1.2; g.add(scan); g.userData.scan = scan;
  return g;
}

function bustStage(canvas, transparent = false) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: transparent, preserveDrawingBuffer: true });
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene();
  const pm = new THREE.PMREMGenerator(renderer);
  scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.55;
  const cam = new THREE.PerspectiveCamera(30, 1, 0.1, 20);
  cam.position.set(0, -0.35, 4.6); cam.lookAt(0, -0.4, 0);
  const key = new THREE.DirectionalLight(0xfff1e0, 2.6); key.position.set(1.5, 1.6, 2.2); scene.add(key);
  const rim = new THREE.DirectionalLight(0x6fd3ff, 3.2); rim.position.set(-2, 1, -2); scene.add(rim);
  const rim2 = new THREE.DirectionalLight(0xff8a2a, 1.6); rim2.position.set(2.4, -0.4, -1.5); scene.add(rim2);
  scene.add(new THREE.HemisphereLight(0x3a5a80, 0x080a10, 0.7));
  return { renderer, scene, cam };
}

// Live, rotating bust for the creator screen.
export function createBustViewer(canvas, pilot) {
  const st = bustStage(canvas, true);
  let bust = buildBust(pilot); st.scene.add(bust);
  let t = 0, raf = 0, alive = true;
  function size() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    st.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    st.renderer.setSize(w, h, false); st.cam.aspect = w / h; st.cam.updateProjectionMatrix();
  }
  size(); addEventListener('resize', size);
  (function loop() {
    if (!alive) return;
    raf = requestAnimationFrame(loop); t += 0.016;
    bust.rotation.y = Math.sin(t * 0.45) * 0.55;
    bust.userData.head.rotation.x = Math.sin(t * 0.7) * 0.04;
    const sc = bust.userData.scan; if (sc) { const k = (t * 0.35) % 1; sc.position.y = -1.2 + k * 1.55; sc.material.opacity = 0.55 * (1 - k); }
    st.renderer.render(st.scene, st.cam);
  })();
  return {
    set(p) { st.scene.remove(bust); bust = buildBust(p); st.scene.add(bust); },
    dispose() { alive = false; cancelAnimationFrame(raf); removeEventListener('resize', size); st.renderer.dispose(); },
  };
}

// Static portrait drawn into a 2D canvas (HUD card).
export function drawPortrait(target, pilot) {
  const c = document.createElement('canvas'); c.width = c.height = 192;
  const st = bustStage(c, false);
  st.scene.background = new THREE.Color(0x0b1624);
  const b = buildBust(pilot); b.rotation.y = 0.35; st.scene.add(b);
  st.cam.position.set(0, -0.12, 2.1); st.cam.lookAt(0, -0.14, 0);
  st.renderer.setSize(192, 192, false);
  st.renderer.render(st.scene, st.cam);
  target.width = target.height = 192;
  target.getContext('2d').drawImage(c, 0, 0);
  st.renderer.dispose();
}


// ---------------------------------------------------------------- animated CC0 astronauts (Quaternius) with suit recolour
const gltfCache = new Map();
function loadSpecies(assetUrl, i) {
  const url = assetUrl(`pilot_${i}.glb`);
  if (!gltfCache.has(url)) gltfCache.set(url, new Promise((res, rej) => new GLTFLoader().load(url, res, undefined, rej)));
  return gltfCache.get(url);
}

function tintMaterial(src, pilot) {
  const m = src.clone();
  m.userData.uSuit = { value: new THREE.Color(SUITS[pilot.suit]) };
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uSuit = m.userData.uSuit;
    sh.fragmentShader = 'uniform vec3 uSuit;\n' + sh.fragmentShader.replace('#include <map_fragment>', `
      #ifdef USE_MAP
        vec4 sampledDiffuseColor = texture2D( map, vMapUv );
        vec3 cc = sampledDiffuseColor.rgb;
        float mx = max(cc.r, max(cc.g, cc.b)), mn = min(cc.r, min(cc.g, cc.b));
        float lum = dot(cc, vec3(0.299, 0.587, 0.114));
        if (mx - mn < 0.07 && lum > 0.16 && lum < 0.62) sampledDiffuseColor.rgb = uSuit * clamp(lum / 0.36, 0.55, 1.25);
        diffuseColor *= sampledDiffuseColor;
      #endif`);
  };
  m.customProgramCacheKey = () => 'suit-tint';
  return m;
}

export async function loadPilotModel(assetUrl, pilot) {
  const gltf = await loadSpecies(assetUrl, pilot.helmet % 3);
  const root = SkeletonUtils.clone(gltf.scene);
  root.traverse((o) => { if (o.isMesh) { o.material = tintMaterial(o.material, pilot); o.castShadow = true; o.frustumCulled = false; } });
  root.scale.setScalar(0.56);                       // 3.24 units -> ~1.8 m
  const mixer = new THREE.AnimationMixer(root);
  const clip = (n) => gltf.animations.find((a) => a.name.endsWith('|' + n));
  const play = (name, { once = false, fade = 0.25 } = {}) => {
    const c = clip(name); if (!c) return;
    const a = mixer.clipAction(c);
    a.reset(); a.setLoop(once ? THREE.LoopOnce : THREE.LoopRepeat); a.clampWhenFinished = once;
    if (play.cur && play.cur !== a) play.cur.crossFadeTo(a, fade, false);
    a.play(); play.cur = a;
    if (once) { const back = () => { mixer.removeEventListener('finished', back); play('Idle'); }; mixer.addEventListener('finished', back); }
  };
  play('Idle');
  return { root, mixer, play, recolor(p) { root.traverse((o) => { if (o.isMesh) o.material.userData.uSuit.value.set(SUITS[p.suit]); }); } };
}

// Creator viewer: animated full-body pilot on a holo pedestal.
export function createPilotViewer(canvas, pilot, assetUrl) {
  const st = bustStage(canvas, true);
  st.cam.position.set(0, 1.42, 2.55); st.cam.lookAt(0, 1.3, 0); st.cam.fov = 30; st.cam.updateProjectionMatrix();
  const visCol = new THREE.Color(VISORS[pilot.visor]);
  const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.8, 0.08, 64), new THREE.MeshStandardMaterial({ color: 0x1c2028, metalness: 0.85, roughness: 0.3 }));
  ped.position.y = -0.04; st.scene.add(ped);
  const ringMat = new THREE.MeshBasicMaterial({ color: visCol, toneMapped: false });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.76, 0.008, 6, 96), ringMat); ring.rotation.x = Math.PI / 2; ring.position.y = 0.005; st.scene.add(ring);
  const scanMat = new THREE.MeshBasicMaterial({ color: visCol, transparent: true, opacity: 0.6, toneMapped: false });
  const scan = new THREE.Mesh(new THREE.TorusGeometry(0.66, 0.005, 6, 96), scanMat); scan.rotation.x = Math.PI / 2; st.scene.add(scan);
  let model = null, species = -1, alive = true, raf = 0, t = 0, last = performance.now(), loading = null;
  async function set(p) {
    ringMat.color.set(VISORS[p.visor]); scanMat.color.set(VISORS[p.visor]);
    if (p.helmet !== species) {
      species = p.helmet;
      const want = species;
      loading = loadPilotModel(assetUrl, p);
      const m = await loading; if (!alive || want !== species) return;
      if (model) st.scene.remove(model.root);
      model = m; st.scene.add(model.root); model.play('Wave', { once: true });
    } else if (model) { model.recolor(p); model.play('Wave', { once: true }); }
  }
  function size() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    st.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    st.renderer.setSize(w, h, false); st.cam.aspect = w / h; st.cam.updateProjectionMatrix();
  }
  size(); addEventListener('resize', size);
  // drag the pilot to turn it
  let drag = 0, dx0 = null;
  canvas.addEventListener('pointerdown', (e) => { dx0 = e.clientX; canvas.setPointerCapture(e.pointerId); });
  canvas.addEventListener('pointermove', (e) => { if (dx0 === null) return; drag += (e.clientX - dx0) * 0.01; dx0 = e.clientX; });
  canvas.addEventListener('pointerup', () => { dx0 = null; });
  (function loop(now) {
    if (!alive) return;
    raf = requestAnimationFrame(loop);
    const dt = Math.min(0.05, ((now || performance.now()) - last) / 1000); last = now || performance.now(); t += dt;
    if (model) { model.mixer.update(dt); model.root.rotation.y = Math.sin(t * 0.35) * 0.32 + drag; }
    const k = (t * 0.35) % 1; scan.position.y = 0.05 + k * 1.9; scanMat.opacity = 0.55 * (1 - k);
    st.renderer.render(st.scene, st.cam);
  })();
  set(pilot);
  return { set, dispose() { alive = false; cancelAnimationFrame(raf); removeEventListener('resize', size); st.renderer.dispose(); } };
}

// HUD portrait: head-and-shoulders render of the chosen pilot.
export async function drawPilotPortrait(target, pilot, assetUrl, { bg = 0xc9cdd3 } = {}) {
  const c = document.createElement('canvas'); c.width = c.height = 192;
  const st = bustStage(c, false);
  st.scene.background = new THREE.Color(bg);
  const m = await loadPilotModel(assetUrl, pilot);
  m.mixer.update(0.4); st.scene.add(m.root); m.root.rotation.y = 0.35;
  st.cam.position.set(0, 1.5, 1.55); st.cam.lookAt(0, 1.42, 0); st.cam.fov = 32; st.cam.updateProjectionMatrix();
  st.renderer.setSize(192, 192, false);
  st.renderer.render(st.scene, st.cam);
  target.width = target.height = 192;
  target.getContext('2d').drawImage(c, 0, 0);
  st.renderer.dispose();
}
