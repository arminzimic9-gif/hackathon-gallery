// Walkable rooms built from the Blender-baked GLBs: Hangar (departure), Grand Gallery, Command Bridge.
import * as THREE from 'three';
import { prepareBakedRoom, findEmpties } from './engine.js';
import { SUITS, VISORS } from './pilot.js';
import { artTexture } from './art.js';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { PLANET_VS, PLANET_FS } from './space.js';

function spaceBackdrop(scene, { planetPos, planetR = 600, stars = 5000 } = {}) {
  const sp = []; for (let i = 0; i < stars; i++) { const v = new THREE.Vector3().randomDirection().multiplyScalar(1800 + Math.random() * 600); sp.push(v.x, v.y, v.z); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));
  scene.add(new THREE.Points(g, new THREE.PointsMaterial({ color: 0xdbe7ff, size: 1.4, sizeAttenuation: false, fog: false })));
  if (planetPos) {
    const sunDir = new THREE.Vector3(-0.6, 0.35, -0.2).normalize();
    const p = new THREE.Mesh(new THREE.SphereGeometry(planetR, 96, 48), new THREE.ShaderMaterial({ vertexShader: PLANET_VS, fragmentShader: PLANET_FS, uniforms: { uSun: { value: sunDir } }, fog: false }));
    p.position.copy(planetPos); scene.add(p);
    const l = new THREE.DirectionalLight(0xbcd6ff, 1.2); l.position.copy(planetPos).normalize().multiplyScalar(-50); scene.add(l);
  }
}

// floating dust in light shafts
function dust(scene, box, count = 600, color = 0xbfd8ff) {
  const pos = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) { pos[i * 3] = THREE.MathUtils.lerp(box.min[0], box.max[0], Math.random()); pos[i * 3 + 1] = Math.random() * box.h; pos[i * 3 + 2] = THREE.MathUtils.lerp(box.min[2], box.max[2], Math.random()); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const c = document.createElement('canvas'); c.width = c.height = 32;
  const cx = c.getContext('2d'); const gr = cx.createRadialGradient(16, 16, 0, 16, 16, 16); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); cx.fillStyle = gr; cx.fillRect(0, 0, 32, 32);
  const pts = new THREE.Points(g, new THREE.PointsMaterial({ color, size: 0.035, map: new THREE.CanvasTexture(c), transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending }));
  scene.add(pts);
  return (dt) => { for (let i = 0; i < count; i++) { pos[i * 3 + 1] += dt * 0.05; if (pos[i * 3 + 1] > box.h) pos[i * 3 + 1] = 0; } g.attributes.position.needsUpdate = true; };
}

// glossy floor: a half-resolution planar mirror blended softly over the baked floor
function floorSheen(scene, w, l, y = 0.015, z = 0, strength = 0.24) {
  const scale = Math.min(devicePixelRatio, 1.5) * 0.5;
  const m = new Reflector(new THREE.PlaneGeometry(w, l), { textureWidth: innerWidth * scale, textureHeight: innerHeight * scale, color: 0xffffff });
  m.material.transparent = true; m.material.depthWrite = false;
  m.material.fragmentShader = m.material.fragmentShader.replace(/gl_FragColor = vec4\( blendOverlay\( base\.rgb, color \), 1\.0 \);/, `gl_FragColor = vec4( base.rgb, ${strength.toFixed(2)} );`);
  m.rotation.x = -Math.PI / 2; m.position.set(0, y, z); scene.add(m);
  return m;
}

function artPanel(item, w, h, holo = false) {
  const tex = artTexture(item);
  const g = new THREE.Group();
  const mat = holo
    ? new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.92, toneMapped: false })
    : new THREE.MeshBasicMaterial({ map: tex, toneMapped: false });
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  plane.userData.art = item;
  g.add(plane);
  if (holo) {
    const edge = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.PlaneGeometry(w * 1.02, h * 1.02)), new THREE.LineBasicMaterial({ color: 0x6fd3ff }));
    g.add(edge);
  }
  return g;
}


// soft radial texture shared by light pools and beams
let _glowTex = null;
function glowTexture() {
  if (_glowTex) return _glowTex;
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d'); const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.45, 'rgba(255,255,255,0.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  _glowTex = new THREE.CanvasTexture(c); return _glowTex;
}
function beamTexture() {
  const c = document.createElement('canvas'); c.width = 64; c.height = 256;
  const g = c.getContext('2d'); const gr = g.createLinearGradient(0, 0, 0, 256);
  gr.addColorStop(0, 'rgba(255,255,255,0.9)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 256);
  const h = g.createLinearGradient(0, 0, 64, 0); h.addColorStop(0, 'rgba(0,0,0,1)'); h.addColorStop(0.5, 'rgba(0,0,0,0)'); h.addColorStop(1, 'rgba(0,0,0,1)');
  g.globalCompositeOperation = 'destination-out'; g.fillStyle = h; g.fillRect(0, 0, 64, 256);
  return new THREE.CanvasTexture(c);
}
function plaque(item) {
  const c = document.createElement('canvas'); c.width = 512; c.height = 160;
  const g = c.getContext('2d');
  g.fillStyle = 'rgba(6,14,24,0.82)'; g.fillRect(0, 0, 512, 160);
  g.strokeStyle = 'rgba(111,211,255,0.9)'; g.lineWidth = 3; g.strokeRect(2, 2, 508, 156);
  g.fillStyle = '#6fd3ff'; g.font = '600 22px ui-monospace, monospace'; g.fillText((item.sample ? 'SAMPLE' : 'EXHIBIT').padEnd(10) + '· HACKATHON STATION', 22, 42);
  g.fillStyle = '#e9f3ff'; g.font = '800 40px ui-sans-serif, system-ui, sans-serif'; g.fillText(item.title.slice(0, 22), 22, 96);
  g.fillStyle = '#8aa0b8'; g.font = '500 24px ui-sans-serif, system-ui, sans-serif'; g.fillText((item.author || '').slice(0, 34), 22, 134);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.34), new THREE.MeshBasicMaterial({ map: t, transparent: true, toneMapped: false }));
}

function obstaclesOf(meta, extra = []) { return meta.obstacles.map((o) => ({ min: o.min, max: o.max })).concat(extra); }

// ---------------------------------------------------------------- HANGAR (departure bay)
export async function createHangar(engine, meta, flightGltf, pilot, art, hooks) {
  const g = await engine.load('hangar.glb');
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x02030a);
  scene.fog = new THREE.FogExp2(0x0a1220, 0.0045);
  const root = g.scene; scene.add(root);
  const special = prepareBakedRoom(root, { bakedIntensity: 1.9, lightIntensity: 0.45 });
  const empties = findEmpties(root);
  if (special.SHIP) special.SHIP.visible = false;           // replaced by the pilot's own fighter
  spaceBackdrop(scene, { planetPos: new THREE.Vector3(60, -40, -420), planetR: 160 });
  scene.add(new THREE.HemisphereLight(0x6f8fbf, 0x0a0c12, 0.9));
  const key = new THREE.DirectionalLight(0xcfe2ff, 1.4); key.position.set(0, 12, -40); scene.add(key);
  floorSheen(scene, 40, 64, 0.015, 0, 0.18);
  const tickDust = dust(scene, { min: [-18, 0, -30], max: [18, 0, 30], h: 18 });

  // the pilot's fighter on the landing pad, livery = suit colour
  const objs = {}; flightGltf.scene.traverse((o) => { objs[o.name] = o; });
  const fighter = objs.FIGHTER.clone(true);
  const suit = new THREE.Color(SUITS[pilot.suit]), glow = new THREE.Color(VISORS[pilot.visor]);
  fighter.traverse((o) => { if (!o.isMesh) return; o.material = o.material.clone(); if (o.material.name?.includes('accent')) o.material.color.copy(suit); if (o.material.emissive && o.material.emissiveIntensity > 1) { o.material.emissive.copy(glow); o.material.emissiveIntensity = 1.6; } });
  const ship = new THREE.Group(); ship.add(fighter); ship.position.set(0, 1.35, -6); scene.add(ship);
  for (const [x, z] of [[0, -3.2], [-1.1, 2], [1.1, 2]]) { const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 1.35, 8), new THREE.MeshStandardMaterial({ color: 0x15181d, metalness: 0.7, roughness: 0.4 })); leg.position.set(x, -0.68, z); ship.add(leg); }
  const spot = new THREE.SpotLight(0xfff0e0, 260, 30, 0.5, 0.6, 1.5); spot.position.set(0, 14, -6); spot.target = ship; scene.add(spot);
  const glowLight = new THREE.PointLight(glow, 6, 8, 2); glowLight.position.set(0, 1.2, -1); ship.add(glowLight);

  // art along the walls (hangar shows the first pieces)
  const slots = Object.keys(empties).filter((n) => n.startsWith('ART_SLOT')).sort();
  slots.forEach((n, i) => { if (!art[i]) return; const p = artPanel(art[i], 3.0, 3.9, true); const e = empties[n]; const wp = e.getWorldPosition(new THREE.Vector3()); p.position.copy(wp); p.position.x -= Math.sign(wp.x) * 0.25; p.rotation.y = wp.x < 0 ? Math.PI / 2 : -Math.PI / 2; scene.add(p); });

  const shipBox = { min: [-5.2, 0, -11.5], max: [5.2, 4, -0.5] };
  let mode = 'walk', tt = 0;
  function enter(player) {
    player.setWorld({ walk: meta.hangar.walk_bounds, obstacles: obstaclesOf(meta, [shipBox]) });
    const sp = empties.SPAWN.getWorldPosition(new THREE.Vector3());
    player.place([sp.x, 1.7, sp.z], 0);
  }
  function update(dt, time, player) {
    tickDust(dt);
    if (mode === 'walk') {
      player.update(dt);
      const d = Math.hypot(player.pos.x - ship.position.x, player.pos.z - ship.position.z);
      hooks.prompt(d < 7.5 ? 'Your fighter is fuelled and ready' : null, 'Board', () => { if (mode === 'walk') { mode = 'takeoff'; tt = 0; hooks.onBoard(); } });
      ship.position.y = 1.35 + Math.sin(time * 1.2) * 0.02;
      return;
    }
    // takeoff: lift, hold, then punch out through the force field
    tt += dt;
    const cam = engine.camera;
    const lift = THREE.MathUtils.smoothstep(tt, 0.3, 2.2) * 3.0;
    const go = Math.max(0, tt - 2.4);
    ship.position.set(0, 1.35 + lift, -6 - go * go * 14);
    ship.rotation.x = -THREE.MathUtils.smoothstep(tt, 0.4, 2.0) * 0.06;
    const camWant = new THREE.Vector3(ship.position.x + 2.5, ship.position.y + 3.2, ship.position.z + 13 - Math.min(go, 1) * 2);
    cam.position.lerp(camWant, 1 - Math.exp(-dt * 3));
    cam.lookAt(ship.position.x, ship.position.y + 0.8, ship.position.z - 12);
    glowLight.intensity = 6 + go * 40;
    if (ship.position.z < -60 && mode === 'takeoff') { mode = 'gone'; hooks.onLaunched(); }
  }
  return { scene, enter, update, bloom: { strength: 0.38, radius: 0.35, threshold: 0.95 } };
}

// ---------------------------------------------------------------- GRAND GALLERY
export async function createGallery(engine, meta, art, hooks) {
  const g = await engine.load('gallery.glb');
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x02030a);
  scene.fog = new THREE.FogExp2(0x070a12, 0.0085);
  const root = g.scene; scene.add(root);
  prepareBakedRoom(root, { bakedIntensity: 0.95, lightIntensity: 1.0 });
  const empties = findEmpties(root);
  scene.add(new THREE.HemisphereLight(0x8aa6d0, 0x0a0a10, 0.8));
  const key = new THREE.DirectionalLight(0xffe2c0, 1.1); key.position.set(4, 16, 10); scene.add(key);
  spaceBackdrop(scene, { planetPos: new THREE.Vector3(-200, 900, -600), planetR: 260 });
  floorSheen(scene, 16, 96, 0.015, 0, 0.26);
  const tickDust = dust(scene, { min: [-7, 0, -46], max: [7, 0, 46], h: 16 }, 900, 0xffe6c4);

  // artworks in the gilded frames; picture lights add a warm pool on each
  const panels = [];
  Object.keys(empties).filter((n) => n.startsWith('ART_SLOT')).sort().forEach((n, i) => {
    const item = art[i % art.length]; const e = empties[n];
    const w = (e.userData.width || 3.4) * 0.98, h = (e.userData.height || 2.6) * 0.98;
    const p = artPanel(item, w, h);
    const wp = e.getWorldPosition(new THREE.Vector3());
    p.position.copy(wp); p.position.x -= Math.sign(wp.x) * 0.03;
    p.rotation.y = wp.x < 0 ? Math.PI / 2 : -Math.PI / 2;
    scene.add(p); panels.push({ group: p, item });
    // warm light pool on the wall around the painting
    const pool = new THREE.Mesh(new THREE.PlaneGeometry(w * 2.1, h * 2.3), new THREE.MeshBasicMaterial({ map: glowTexture(), color: 0xffc58a, transparent: true, opacity: 0.32, blending: THREE.AdditiveBlending, depthWrite: false }));
    pool.position.copy(p.position); pool.position.x += Math.sign(wp.x) * 0.06; pool.position.y += 0.35; pool.rotation.y = p.rotation.y; scene.add(pool);
    // holo plaque beside the frame
    const pl = plaque(item); pl.position.copy(p.position); pl.position.x -= Math.sign(wp.x) * 0.02; pl.rotation.y = p.rotation.y;
    const side = new THREE.Vector3(w / 2 + 0.95, -h / 2 + 0.17, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), p.rotation.y);
    pl.position.add(side); scene.add(pl);
  });
  // featured pieces float as rotating holograms above the glowing plinths
  const holos = [];
  Object.keys(empties).filter((n) => n.startsWith('FEATURE_SLOT')).sort().forEach((n, i) => {
    const item = art[(i + 3) % art.length];
    const p = artPanel(item, 1.8, 1.35, true); p.position.copy(empties[n].getWorldPosition(new THREE.Vector3()));
    scene.add(p); holos.push(p);
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.6, 1.3, 32, 1, true), new THREE.MeshBasicMaterial({ color: 0x6fd3ff, transparent: true, opacity: 0.12, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }));
    beam.position.copy(p.position).add(new THREE.Vector3(0, -0.95, 0)); scene.add(beam);
  });
  const rotors = []; root.traverse((o) => { if (o.name.startsWith('ROT_')) rotors.push(o); });
  const shafts = []; const btex = beamTexture();
  for (let i = 0; i < 9; i++) {
    const z = 40 - i * 10;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 17), new THREE.MeshBasicMaterial({ map: btex, color: 0xa8c8ff, transparent: true, opacity: 0.07, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    m.position.set((i % 2 ? 1 : -1) * 0.8, 8.6, z); m.rotation.set(0, i * 0.7, (i % 2 ? 1 : -1) * 0.12);
    scene.add(m); shafts.push(m);
  }

  const lift = empties.DOOR_BRIDGE_LIFT.getWorldPosition(new THREE.Vector3());
  const ray = new THREE.Raycaster(); ray.far = 9;
  const center = new THREE.Vector2(0, 0);
  const viewed = new Set();
  function enter(player, from = 'dock') {
    player.setWorld({ walk: { min: [-6.9, 0, -45.5], max: [6.9, 0, 45.5] }, obstacles: obstaclesOf(meta) });
    if (from === 'bridge') player.place([0, 1.7, lift.z + 3], Math.PI);
    else player.place([0, 1.7, 43.5], 0);
  }
  function update(dt, time, player) {
    player.update(dt); tickDust(dt);
    rotors.forEach((r, i) => { r.rotation.y += dt * (0.25 + i * 0.07); r.rotation.x += dt * 0.05 * (i % 2 ? 1 : -1); });
    holos.forEach((p, i) => { p.rotation.y = time * 0.35 + i; p.position.y += Math.sin(time * 1.3 + i) * 0.0015; });
    shafts.forEach((m, i) => { m.material.opacity = 0.05 + Math.sin(time * 0.4 + i * 1.7) * 0.025; m.lookAt(engine.camera.position.x, m.position.y, engine.camera.position.z); m.rotation.z = (i % 2 ? 1 : -1) * 0.12; });
    // what is the visitor looking at?
    ray.setFromCamera(center, engine.camera);
    const hit = ray.intersectObjects(panels.map((p) => p.group), true)[0];
    const nearLift = Math.hypot(player.pos.x - lift.x, player.pos.z - lift.z) < 4.5;
    if (nearLift) hooks.prompt('Lift to the Command Bridge · winners', 'Ride lift', () => hooks.onLift());
    else if (hit?.object.userData.art) {
      const it = hit.object.userData.art;
      hooks.prompt(it.title, 'View', () => { hooks.onView(it); if (!viewed.has(it.id)) { viewed.add(it.id); hooks.onNewView(viewed.size); } });
    } else hooks.prompt(null);
  }
  return { scene, enter, update, bloom: { strength: 0.5, radius: 0.5, threshold: 0.9 } };
}

// ---------------------------------------------------------------- COMMAND BRIDGE (winners)
export async function createBridge(engine, meta, winners, hooks) {
  const g = await engine.load('bridge.glb');
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x02030a);
  scene.fog = new THREE.FogExp2(0x060a14, 0.004);
  const root = g.scene; scene.add(root);
  prepareBakedRoom(root, { bakedIntensity: 0.72, lightIntensity: 0.6 });
  const empties = findEmpties(root);
  scene.add(new THREE.HemisphereLight(0x6f8fbf, 0x080a10, 0.7));
  spaceBackdrop(scene, { planetPos: new THREE.Vector3(-260, -330, -900), planetR: 520 });
  floorSheen(scene, 34, 10, 0.015, 8, 0.22);

  // winner holograms above the holo-table, trophies in the alcoves
  const holos = [];
  [1, 2, 3].forEach((k) => {
    const e = empties['WINNER_SLOT_' + k]; if (!e) return;
    const item = winners[k - 1] || { id: 'sealed-' + k, title: `Place ${k} · sealed until the ceremony`, palette: ['#06101c', '#6fd3ff', '#ff8a2a'], seed: 40 + k };
    const p = artPanel(item, 1.2, 0.9, true); p.position.copy(e.getWorldPosition(new THREE.Vector3())); scene.add(p); holos.push(p);
    const t = empties['TROPHY_SLOT_' + k];
    if (t) {
      const trophy = new THREE.Mesh(k === 1 ? new THREE.TorusKnotGeometry(0.28, 0.08, 128, 16) : new THREE.IcosahedronGeometry(0.32, 0), new THREE.MeshStandardMaterial({ color: [0xffc861, 0xd8dee8, 0xc98a5a][k - 1], metalness: 1, roughness: 0.18 }));
      trophy.position.copy(t.getWorldPosition(new THREE.Vector3())); scene.add(trophy); holos.push(trophy);
      const tl = new THREE.PointLight(0xffd9a0, 8, 4, 2); tl.position.copy(trophy.position).add(new THREE.Vector3(0, 1.2, 0.8)); scene.add(tl);
    }
  });
  const liftPos = empties.LIFT_ARRIVAL.getWorldPosition(new THREE.Vector3());
  function enter(player) {
    player.setWorld({ walk: { min: [-15.5, 0, 3.0], max: [15.5, 0, 12.3] }, obstacles: obstaclesOf(meta) });
    player.place([liftPos.x, 1.7, liftPos.z], 0);
  }
  function update(dt, time, player) {
    player.update(dt);
    holos.forEach((p, i) => { p.rotation.y = time * 0.5 + i; });
    const d = Math.hypot(player.pos.x - liftPos.x, player.pos.z - (liftPos.z + 1.5));
    const dTable = Math.hypot(player.pos.x, player.pos.z - 6.5);
    if (d < 2.6) hooks.prompt('Lift down to the Grand Gallery', 'Ride lift', () => hooks.onLift());
    else if (dTable < 4.2) hooks.prompt('The Ceremony Hall awaits · winners on stage', 'Enter hall', () => hooks.onCeremony());
    else hooks.prompt(null);
  }
  return { scene, enter, update, bloom: { strength: 0.45, radius: 0.5, threshold: 0.92 } };
}

// ---------------------------------------------------------------- CEREMONY HALL
function screenCanvas() { const c = document.createElement('canvas'); c.width = 1600; c.height = 900; return c; }
function drawScreen(c, { kicker = 'AGENTIC AI · 2026', title = 'CLOSING CEREMONY', sub = '11 OCTOBER 2026 · HACKATHON STATION', glow = '#6fd3ff', big = false } = {}) {
  const g = c.getContext('2d');
  const bg = g.createRadialGradient(800, 450, 50, 800, 450, 900); bg.addColorStop(0, '#0a1a2e'); bg.addColorStop(1, '#02050b');
  g.fillStyle = bg; g.fillRect(0, 0, 1600, 900);
  g.strokeStyle = 'rgba(111,211,255,0.25)'; for (let y = 0; y < 900; y += 6) { g.beginPath(); g.moveTo(0, y); g.lineTo(1600, y); g.stroke(); }
  g.textAlign = 'center'; g.fillStyle = glow; g.font = '600 38px ui-monospace, monospace'; g.fillText(kicker, 800, 300);
  g.fillStyle = '#e9f3ff'; g.font = `800 ${big ? 260 : 120}px ui-sans-serif, system-ui, sans-serif`; g.fillText(title, 800, big ? 560 : 470);
  g.fillStyle = '#8aa0b8'; g.font = '500 40px ui-sans-serif, system-ui, sans-serif'; g.fillText(sub, 800, big ? 680 : 570);
}

export async function createCeremony(engine, meta, winners, hooks) {
  const g = await engine.load('ceremony.glb');
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x02030a);
  scene.fog = new THREE.FogExp2(0x060a14, 0.006);
  const root = g.scene; scene.add(root);
  const special = prepareBakedRoom(root, { bakedIntensity: 0.9, lightIntensity: 0.7 });
  const empties = findEmpties(root);
  scene.add(new THREE.HemisphereLight(0x6f8fbf, 0x080a10, 0.6));
  spaceBackdrop(scene, { planetPos: null });
  floorSheen(scene, 52, 52, 0.015, 0, 0.2);
  const tickDust = dust(scene, { min: [-12, 0, -16], max: [12, 0, 10], h: 14 }, 700, 0xffe6c4);
  const baked = []; root.traverse((o) => { if (o.isMesh && o.material?.emissiveMap) baked.push(o.material); });

  // the big curved screen shows live graphics
  const sc = screenCanvas(); drawScreen(sc);
  const stex = new THREE.CanvasTexture(sc); stex.colorSpace = THREE.SRGBColorSpace;
  // curved LED screen rebuilt here (matches the Blender frame: r 14.95, 58°–122°, y 2.4–11.1)
  const screenGeo = new THREE.CylinderGeometry(14.85, 14.85, 8.7, 64, 1, true, THREE.MathUtils.degToRad(148), THREE.MathUtils.degToRad(64));
  stex.wrapS = THREE.RepeatWrapping; stex.repeat.x = -1;
  const screenMesh = new THREE.Mesh(screenGeo, new THREE.MeshBasicMaterial({ map: stex, side: THREE.BackSide, toneMapped: false }));
  screenMesh.position.set(0, 6.75, 0); scene.add(screenMesh);
  // dark glossy stage top with a glowing inner ring (the baked top reads too bright)
  const stageTop = new THREE.Mesh(new THREE.CircleGeometry(7.12, 96), new THREE.MeshStandardMaterial({ color: 0x05070a, roughness: 0.35, metalness: 0.5 }));
  stageTop.rotation.x = -Math.PI / 2; stageTop.position.set(0, 1.07, -6); scene.add(stageTop);
  const stageRing = new THREE.Mesh(new THREE.RingGeometry(2.85, 2.95, 96), new THREE.MeshBasicMaterial({ color: 0xff8a2a, toneMapped: false }));
  stageRing.rotation.x = -Math.PI / 2; stageRing.position.set(0, 1.075, -6); scene.add(stageRing);
  const stageEdge = new THREE.Mesh(new THREE.RingGeometry(7.0, 7.1, 128), new THREE.MeshBasicMaterial({ color: 0x6fd3ff, toneMapped: false }));
  stageEdge.rotation.x = -Math.PI / 2; stageEdge.position.set(0, 1.075, -6); scene.add(stageEdge);

  // moving spotlight cones from the truss
  const coneGeo = new THREE.ConeGeometry(0.85, 9.5, 24, 1, true); coneGeo.translate(0, -4.75, 0);
  const cones = [];
  Object.keys(empties).filter((n) => n.startsWith('SPOT_')).filter((_, i) => i % 2 === 0).forEach((n, i) => {
    const m = new THREE.Mesh(coneGeo, new THREE.MeshBasicMaterial({ color: i % 2 ? 0x9fd8ff : 0xffc58a, transparent: true, opacity: 0.0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    m.position.copy(empties[n].getWorldPosition(new THREE.Vector3())); scene.add(m); cones.push(m);
  });
  const key = new THREE.SpotLight(0xfff0dc, 0, 30, 0.45, 0.5, 1.4); key.position.set(0, 12, 2); key.target.position.set(0, 1, -7.5); scene.add(key, key.target);

  // podium holograms + trophies
  const podiums = [1, 2, 3].map((k) => {
    const e = empties['PLACE_' + k]; const pos = e.getWorldPosition(new THREE.Vector3());
    const item = winners[k - 1] || { id: 'sealed-c' + k, title: `Place ${k}`, author: 'Revealed at the ceremony', palette: ['#06101c', '#6fd3ff', '#ff8a2a'], seed: 60 + k };
    const holo = artPanel(item, 1.6, 1.2, true); holo.position.copy(pos).add(new THREE.Vector3(0, 1.4, 0)); holo.scale.setScalar(0.001); scene.add(holo);
    const trophy = new THREE.Mesh(k === 1 ? new THREE.TorusKnotGeometry(0.22, 0.07, 128, 16) : new THREE.IcosahedronGeometry(0.26, 0), new THREE.MeshStandardMaterial({ color: [0xffc861, 0xd8dee8, 0xc98a5a][k - 1], metalness: 1, roughness: 0.15, emissive: [0x553300, 0x222630, 0x331a08][k - 1] }));
    trophy.position.copy(pos).add(new THREE.Vector3(0, 0.35, 0)); trophy.visible = false; scene.add(trophy);
    return { k, item, holo, trophy, pos };
  });

  // confetti
  const CONF = 900;
  const confGeo = new THREE.PlaneGeometry(0.08, 0.14);
  const confMat = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide, toneMapped: false });
  const conf = new THREE.InstancedMesh(confGeo, confMat, CONF); conf.visible = false; scene.add(conf);
  const confState = Array.from({ length: CONF }, () => ({ p: new THREE.Vector3(), v: new THREE.Vector3(), r: new THREE.Euler(), s: new THREE.Vector3(Math.random() * 4, Math.random() * 4, Math.random() * 4) }));
  const palette = ['#ff8a2a', '#6fd3ff', '#e9f3ff', '#ffc861', '#c46bff'].map((c) => new THREE.Color(c));
  for (let i = 0; i < CONF; i++) conf.setColorAt(i, palette[i % palette.length]);
  const tmp = new THREE.Object3D();
  function burst(at) {
    conf.visible = true;
    confState.forEach((c) => { c.p.copy(at).add(new THREE.Vector3((Math.random() - .5) * 2, 6 + Math.random() * 3, (Math.random() - .5) * 2)); c.v.set((Math.random() - .5) * 9, Math.random() * 4, (Math.random() - .5) * 9); });
  }

  // simple fanfare with WebAudio (no files)
  let actx = null;
  function fanfare(base = 392) {
    try {
      actx = actx || new AudioContext();
      const now = actx.currentTime;
      [0, 4, 7, 12].forEach((st, i) => {
        const o = actx.createOscillator(), gn = actx.createGain();
        o.type = 'sawtooth'; o.frequency.value = base * Math.pow(2, st / 12);
        gn.gain.setValueAtTime(0, now + i * 0.12); gn.gain.linearRampToValueAtTime(0.08, now + i * 0.12 + 0.03); gn.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.12 + 1.4);
        o.connect(gn).connect(actx.destination); o.start(now + i * 0.12); o.stop(now + i * 0.12 + 1.5);
      });
    } catch { /* audio unavailable */ }
  }

  // ceremony timeline
  let show = null, dim = 0;
  const steps = [
    { t: 0, run: () => { drawScreen(sc, { kicker: 'PLEASE TAKE YOUR SEATS', title: 'CLOSING CEREMONY' }); stex.needsUpdate = true; } },
    { t: 3, run: () => { drawScreen(sc, { kicker: 'STARTING IN', title: '3', big: true, sub: '' }); stex.needsUpdate = true; } },
    { t: 4, run: () => { drawScreen(sc, { kicker: 'STARTING IN', title: '2', big: true, sub: '' }); stex.needsUpdate = true; } },
    { t: 5, run: () => { drawScreen(sc, { kicker: 'STARTING IN', title: '1', big: true, sub: '' }); stex.needsUpdate = true; } },
  ];
  [3, 2, 1].forEach((k, i) => {
    const t0 = 7 + i * 6;
    steps.push({ t: t0, run: () => { drawScreen(sc, { kicker: 'AND IN PLACE', title: ['1ST', '2ND', '3RD'][k - 1], big: true, sub: '' }); stex.needsUpdate = true; } });
    steps.push({ t: t0 + 2, run: () => { const p = podiums[k - 1]; p.revealT = 0; p.trophy.visible = true; drawScreen(sc, { kicker: ['FIRST', 'SECOND', 'THIRD'][k - 1] + ' PLACE', title: p.item.title.slice(0, 18).toUpperCase(), sub: p.item.author || '', glow: k === 1 ? '#ffc861' : '#6fd3ff' }); stex.needsUpdate = true; burst(p.pos); fanfare(k === 1 ? 523 : 392); hooks.onReveal?.(k, p.item); } });
  });
  steps.push({ t: 26, run: () => { drawScreen(sc, { kicker: 'THANK YOU, BUILDERS', title: 'HACKATHON 2026', sub: 'See you at the next one' }); stex.needsUpdate = true; } });

  function startShow() { if (show) return; show = { t: 0, i: 0 }; hooks.onShow?.(); }

  const liftPos = new THREE.Vector3(0, 0, 9.5);
  function enter(player) {
    player.setWorld({ circle: { cx: 0, cz: -2, r: 11.6 }, obstacles: [{ min: [-7.3, 0, -13.3], max: [7.3, 2, 1.3] }] });
    player.place([0, 1.7, 9], 0);
  }
  function update(dt, time, player) {
    player.update(dt); tickDust(dt);
    if (show) {
      show.t += dt;
      while (show.i < steps.length && show.t >= steps[show.i].t) steps[show.i++].run();
      dim = Math.min(1, dim + dt * 0.5);
    }
    baked.forEach((m) => { m.emissiveIntensity = 0.9 - dim * 0.55; });
    key.intensity = dim * 140;
    cones.forEach((c, i) => {
      c.material.opacity = dim * 0.035;
      const a = time * 0.6 + i;
      c.lookAt(Math.sin(a) * 4, 0, -7.5 + Math.cos(a * 1.3) * 3);
      c.rotateX(-Math.PI / 2);
    });
    podiums.forEach((p) => {
      p.trophy.rotation.y += dt * 0.8;
      if (p.revealT !== undefined) { p.revealT = Math.min(1, p.revealT + dt / 1.2); const e = 1 - Math.pow(1 - p.revealT, 4); p.holo.scale.setScalar(Math.max(0.001, e)); p.holo.rotation.y = Math.sin(time * 0.5) * 0.3; }
    });
    if (conf.visible) {
      confState.forEach((c, i) => {
        c.v.y -= dt * 3.2; c.v.multiplyScalar(1 - dt * 0.6); c.p.addScaledVector(c.v, dt);
        if (c.p.y < 0.02) { c.p.y = 0.02; c.v.set(0, 0, 0); }
        c.r.x += c.s.x * dt; c.r.y += c.s.y * dt; c.r.z += c.s.z * dt;
        tmp.position.copy(c.p); tmp.rotation.copy(c.r); tmp.updateMatrix(); conf.setMatrixAt(i, tmp.matrix);
      });
      conf.instanceMatrix.needsUpdate = true;
    }
    const nearStage = Math.hypot(player.pos.x, player.pos.z + 6) < 9.6;
    const nearLift = Math.hypot(player.pos.x - liftPos.x, player.pos.z - liftPos.z) < 2.2;
    if (nearLift) hooks.prompt('Lift to the Command Bridge', 'Ride lift', () => hooks.onLift());
    else if (nearStage && !show) hooks.prompt('Closing ceremony · 11 October', 'Start ceremony', startShow);
    else hooks.prompt(null);
  }
  return { scene, enter, update, startShow, bloom: { strength: 0.55, radius: 0.5, threshold: 0.88 } };
}
