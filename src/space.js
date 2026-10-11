// Space: intro flyby, hyperspace jump, 20-second flight mini-game and docking autopilot.
import * as THREE from 'three';
import { SUITS, VISORS } from './pilot.js';
import { pew } from './weapons.js';

const SKY_VS = `varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }`;
const SKY_FS = `
varying vec3 vDir;
float h(vec3 p){ return fract(sin(dot(p, vec3(127.1,311.7,74.7)))*43758.5453); }
float n(vec3 p){ vec3 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
  return mix(mix(mix(h(i),h(i+vec3(1,0,0)),f.x),mix(h(i+vec3(0,1,0)),h(i+vec3(1,1,0)),f.x),f.y),
             mix(mix(h(i+vec3(0,0,1)),h(i+vec3(1,0,1)),f.x),mix(h(i+vec3(0,1,1)),h(i+vec3(1,1,1)),f.x),f.y),f.z); }
float fbm(vec3 p){ float a=.5, s=0.; for(int i=0;i<5;i++){ s+=a*n(p); p*=2.03; a*=.5; } return s; }
void main(){
  vec3 d = normalize(vDir);
  float neb = fbm(d*2.6 + vec3(3.1,0.,1.7));
  float band = exp(-pow(d.y*2.4 - 0.25, 2.));
  vec3 col = mix(vec3(0.004,0.006,0.016), vec3(0.09,0.04,0.16), smoothstep(.45,.85,neb)*band);
  col += vec3(0.02,0.07,0.14) * smoothstep(.55,.95,fbm(d*5.0+7.))*band;
  gl_FragColor = vec4(col,1.);
}`;
export const PLANET_FS = `
uniform vec3 uSun; varying vec3 vN; varying vec3 vP;
float h(vec3 p){ return fract(sin(dot(p, vec3(127.1,311.7,74.7)))*43758.5453); }
float n(vec3 p){ vec3 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
  return mix(mix(mix(h(i),h(i+vec3(1,0,0)),f.x),mix(h(i+vec3(0,1,0)),h(i+vec3(1,1,0)),f.x),f.y),
             mix(mix(h(i+vec3(0,0,1)),h(i+vec3(1,0,1)),f.x),mix(h(i+vec3(0,1,1)),h(i+vec3(1,1,1)),f.x),f.y),f.z); }
float fbm(vec3 p){ float a=.5, s=0.; for(int i=0;i<6;i++){ s+=a*n(p); p*=2.1; a*=.5; } return s; }
void main(){
  vec3 N = normalize(vN);
  float l = max(dot(N, normalize(uSun)), 0.);
  float land = smoothstep(.48,.56, fbm(N*3.0));
  float cloud = smoothstep(.55,.8, fbm(N*6.0 + 4.));
  vec3 base = mix(vec3(0.03,0.09,0.22), vec3(0.18,0.26,0.2), land);
  base = mix(base, vec3(0.9), cloud*.7);
  vec3 V = normalize(cameraPosition - vP);
  float rim = pow(1. - max(dot(N,V),0.), 3.);
  vec3 col = base * (0.04 + l*1.2) + vec3(0.25,0.55,1.)*rim*(0.25 + l);
  gl_FragColor = vec4(col,1.);
}`;
export const PLANET_VS = `varying vec3 vN; varying vec3 vP; void main(){ vN = normalize(mat3(modelMatrix)*normal); vec4 w = modelMatrix*vec4(position,1.); vP = w.xyz; gl_Position = projectionMatrix*viewMatrix*w; }`;

export function createSpace(engine, gltf, pilot, hooks = {}) {
  const { camera } = engine;
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x02040a, 0.00055);

  // sky, stars, planet, lights
  const sky = new THREE.Mesh(new THREE.SphereGeometry(4000, 48, 24), new THREE.ShaderMaterial({ vertexShader: SKY_VS, fragmentShader: SKY_FS, side: THREE.BackSide, depthWrite: false, fog: false }));
  scene.add(sky);
  const sp = []; for (let i = 0; i < 9000; i++) { const v = new THREE.Vector3().randomDirection().multiplyScalar(2500 + Math.random() * 1200); sp.push(v.x, v.y, v.z); }
  const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));
  scene.add(new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xdfe9ff, size: 1.4, sizeAttenuation: false, fog: false })));
  const sunDir = new THREE.Vector3(-0.6, 0.35, -0.7).normalize();
  const planet = new THREE.Mesh(new THREE.SphereGeometry(900, 96, 48), new THREE.ShaderMaterial({ vertexShader: PLANET_VS, fragmentShader: PLANET_FS, uniforms: { uSun: { value: sunDir } }, fog: false }));
  planet.position.set(1500, -900, -3200); scene.add(planet);
  const sun = new THREE.DirectionalLight(0xfff0dc, 3.2); sun.position.copy(sunDir).multiplyScalar(100); scene.add(sun);
  scene.add(new THREE.HemisphereLight(0x4a6fa0, 0x05070c, 0.55));
  const rimL = new THREE.DirectionalLight(0x6fd3ff, 1.2); rimL.position.set(1, -0.4, 1); scene.add(rimL);

  // station + lights
  const objs = {}; gltf.scene.traverse((o) => { objs[o.name] = o; });
  const station = objs.STATION.clone(true); scene.add(station);
  station.traverse((o) => { if (o.isMesh && o.material?.emissive && o.material.emissiveIntensity > 0) o.material.emissiveIntensity *= 0.6; });
  const mouth = objs.STATION_MOUTH.getWorldPosition(new THREE.Vector3());
  const mouthGlow = new THREE.PointLight(0x4aa8ff, 8000, 400, 2); mouthGlow.position.copy(mouth).add(new THREE.Vector3(0, 0, 10)); scene.add(mouthGlow);

  // fighter with the pilot's livery
  const fighter = objs.FIGHTER.clone(true);
  fighter.position.set(0, 0, 0); fighter.rotation.set(0, 0, 0);
  const suitColor = new THREE.Color(SUITS[pilot.suit]), glowColor = new THREE.Color(VISORS[pilot.visor]);
  fighter.traverse((o) => {
    if (!o.isMesh) return;
    o.material = o.material.clone();
    if (o.material.name?.includes('accent')) o.material.color.copy(suitColor);
    if (o.material.name?.includes('engine') || o.parent?.name === 'FIGHTER_ENGINES' || o.name === 'FIGHTER_ENGINES') { o.material.emissive.copy(glowColor); o.material.emissiveIntensity = 2.2; }
  });
  const ship = new THREE.Group(); ship.add(fighter); scene.add(ship);
  const thrust = new THREE.PointLight(glowColor, 8, 10, 2); thrust.position.set(0, 0, 5); ship.add(thrust);

  // asteroids (instanced, 4 variants) and crystals
  const rocks = [];
  const tmp = new THREE.Object3D();
  const rnd = (a, b) => a + Math.random() * (b - a);
  for (let v = 0; v < 4; v++) {
    const src = objs['ASTEROID_' + v]; if (!src) continue;
    const count = 70;
    const inst = new THREE.InstancedMesh(src.geometry, new THREE.MeshStandardMaterial({ color: 0x55504a, roughness: 0.95, metalness: 0.05, flatShading: true }), count);
    for (let i = 0; i < count; i++) {
      const onPath = Math.random() < 0.2;
      const p = new THREE.Vector3(onPath ? rnd(-14, 14) : rnd(-70, 70), onPath ? rnd(-9, 9) : rnd(-40, 40), rnd(-80, -720));
      const s = onPath ? rnd(1.0, 2.4) : rnd(2, 9);
      tmp.position.copy(p); tmp.rotation.set(rnd(0, 6), rnd(0, 6), rnd(0, 6)); tmp.scale.setScalar(s); tmp.updateMatrix();
      inst.setMatrixAt(i, tmp.matrix);
      rocks.push({ p, r: s * 0.9, inst, i, spin: new THREE.Vector3(rnd(-.4, .4), rnd(-.4, .4), rnd(-.4, .4)), rot: tmp.rotation.clone(), s, hit: false });
    }
    scene.add(inst);
  }
  const crystals = [];
  const cgeo = new THREE.OctahedronGeometry(0.9, 0);
  const cmat = new THREE.MeshStandardMaterial({ color: 0x9fe8ff, emissive: 0x3fc4ff, emissiveIntensity: 3, roughness: 0.2, metalness: 0.3 });
  const cinst = new THREE.InstancedMesh(cgeo, cmat, 46);
  for (let i = 0; i < 46; i++) {
    const z = -100 - i * 13.5;
    const p = new THREE.Vector3(Math.sin(i * 0.7) * 9 + rnd(-3, 3), Math.cos(i * 0.5) * 5 + rnd(-2, 2), z);
    crystals.push({ p, taken: false });
    tmp.position.copy(p); tmp.rotation.set(0, 0, 0); tmp.scale.setScalar(1); tmp.updateMatrix(); cinst.setMatrixAt(i, tmp.matrix);
  }
  scene.add(cinst);

  // hyperspace streaks
  const streakCount = 900;
  const streakPos = new Float32Array(streakCount * 6);
  const streaks = new THREE.LineSegments(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: 0xcfe6ff, transparent: true, opacity: 0, fog: false }));
  streaks.geometry.setAttribute('position', new THREE.BufferAttribute(streakPos, 3));
  const streakSeeds = []; for (let i = 0; i < streakCount; i++) { const a = Math.random() * Math.PI * 2, r = 6 + Math.random() * 60; streakSeeds.push({ x: Math.cos(a) * r, y: Math.sin(a) * r, z: -Math.random() * 400 }); }
  scene.add(streaks);

  // ---------------------------------------------------------------- state
  let mode = 'intro', t = 0, flightT = 0, score = 0, shield = 100, boost = 100, boosting = false;
  const target = new THREE.Vector2(0, 0), offset = new THREE.Vector2(0, 0);
  let dockCurve = null, dockT = 0, hyper = 0;
  let pointer = { x: 0, y: 0, dragging: false, lx: 0, ly: 0 };
  const keys = new Set();
  const kd = (e) => { keys.add(e.key.toLowerCase()); if (e.key === ' ') boosting = true; };
  const ku = (e) => { keys.delete(e.key.toLowerCase()); if (e.key === ' ') boosting = false; };
  addEventListener('keydown', kd); addEventListener('keyup', ku);
  const dom = engine.renderer.domElement;
  const pm = (e) => {
    if (e.pointerType === 'mouse') { pointer.x = (e.clientX / innerWidth) * 2 - 1; pointer.y = -((e.clientY / innerHeight) * 2 - 1); }
    else if (pointer.dragging) { pointer.x = THREE.MathUtils.clamp(pointer.x + (e.clientX - pointer.lx) / 140, -1, 1); pointer.y = THREE.MathUtils.clamp(pointer.y - (e.clientY - pointer.ly) / 140, -1, 1); pointer.lx = e.clientX; pointer.ly = e.clientY; }
  };
  const pd = (e) => { pointer.dragging = true; pointer.lx = e.clientX; pointer.ly = e.clientY; };
  const pu = () => { pointer.dragging = false; };
  dom.addEventListener('pointermove', pm); dom.addEventListener('pointerdown', pd); addEventListener('pointerup', pu);

  const camTarget = new THREE.Vector3(), camPos = new THREE.Vector3();

  // twin wing lasers with a light aim assist toward the nearest rock in front
  const laserGeo = new THREE.CapsuleGeometry(0.07, 2.6, 4, 8); laserGeo.rotateX(Math.PI / 2);
  const laserMat = new THREE.MeshBasicMaterial({ color: glowColor.clone().multiplyScalar(2.5), toneMapped: false });
  const lasers = []; let laserCd = 0, side = 1;
  const blasts = [];
  const LASER_SPEED = 260, fwdZ = new THREE.Vector3(0, 0, -1);
  function aimFrom(start) {
    let best = null, bestScore = Infinity;
    for (const r of rocks) {
      if (r.hit) continue;
      const dz = start.z - r.p.z; if (dz < 12 || dz > 220) continue;
      const lat = Math.hypot(r.p.x - start.x, r.p.y - start.y);
      if (lat > r.r + 2 + dz * 0.07) continue;           // cone widens with distance
      const sc = lat / (dz * 0.07 + 1) + dz * 0.004;
      if (sc < bestScore) { bestScore = sc; best = r; }
    }
    if (!best) return fwdZ.clone();
    return best.p.clone().sub(start).normalize();
  }
  function fire() {
    if (mode !== 'flight' || laserCd > 0) return;
    laserCd = 0.13; side = -side;
    const m = new THREE.Mesh(laserGeo, laserMat);
    m.position.copy(ship.position).add(new THREE.Vector3(side * 4.7, 0.6, -2)); scene.add(m);
    const dir = aimFrom(m.position);
    m.lookAt(m.position.clone().add(dir));
    lasers.push({ m, vel: dir.multiplyScalar(LASER_SPEED), life: 1.2 });
    muzzle(m.position);
    pew(1300, 0.1, 'sawtooth', 0.03);
  }

  // ---- explosion kit: fireball, shockwave ring, flash light, tumbling debris, embers
  const glowTex = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
    const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.18, 'rgba(255,230,180,0.95)'); gr.addColorStop(0.45, 'rgba(255,120,40,0.45)'); gr.addColorStop(1, 'rgba(255,60,10,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 128, 128); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  })();
  const ringGeo = new THREE.RingGeometry(0.92, 1, 64);
  const DEBRIS = 260;
  const debrisSrc = objs.ASTEROID_0 || objs.ASTEROID_1;
  const debrisMesh = new THREE.InstancedMesh(debrisSrc ? debrisSrc.geometry : new THREE.IcosahedronGeometry(1, 0),
    new THREE.MeshStandardMaterial({ color: 0x5a524a, roughness: 0.9, metalness: 0.05, flatShading: true, emissive: 0xff5a1a, emissiveIntensity: 0 }), DEBRIS);
  debrisMesh.frustumCulled = false; debrisMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  const hot = new Float32Array(DEBRIS); debrisMesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(DEBRIS * 3).fill(1), 3);
  const chunks = []; let chunkNext = 0;
  for (let i = 0; i < DEBRIS; i++) { chunks.push({ p: new THREE.Vector3(), v: new THREE.Vector3(), rot: new THREE.Euler(), spin: new THREE.Vector3(), s: 0, life: 0, max: 1 }); tmp.position.set(0, -9999, 0); tmp.scale.setScalar(0); tmp.updateMatrix(); debrisMesh.setMatrixAt(i, tmp.matrix); }
  scene.add(debrisMesh);
  const fx = [];   // fireballs, rings, lights

  function muzzle(at) {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: glowColor, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, toneMapped: false }));
    sp.position.copy(at); sp.scale.setScalar(2.2); scene.add(sp);
    fx.push({ o: sp, life: 0.09, max: 0.09, grow: 0 });
  }
  function blast(at, size = 1.5, vel = null) {
    // embers
    const n = 70, pos = new Float32Array(n * 3), v = [];
    for (let i = 0; i < n; i++) { pos.set([at.x, at.y, at.z], i * 3); v.push(new THREE.Vector3().randomDirection().multiplyScalar((6 + Math.random() * 16) * (0.6 + size * 0.3))); }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const pts = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xffb070, size: 0.4, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
    scene.add(pts); blasts.push({ pts, vel: v, life: 0.9 });
    // fireball core + outer glow
    for (const [k, col, mul, life] of [[2.4, 0xfff4e0, 4, 0.3], [4.4, 0xff8a3a, 3, 0.65], [7, 0xff3a10, 1.6, 1.1]]) {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: new THREE.Color(col).multiplyScalar(mul), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, toneMapped: false }));
      sp.position.copy(at); sp.scale.setScalar(size); scene.add(sp);
      fx.push({ o: sp, life, max: life, grow: size * k });
    }
    // shockwave
    const ring = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: 0xbfe8ff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }));
    ring.position.copy(at); ring.lookAt(camera.position); ring.rotateX((Math.random() - 0.5) * 0.9); ring.scale.setScalar(size); scene.add(ring);
    fx.push({ o: ring, life: 0.6, max: 0.6, grow: size * 9, ring: true });
    // flash
    const L = new THREE.PointLight(0xff7a30, 220 * size, 30 + size * 10, 2); L.position.copy(at); scene.add(L);
    fx.push({ o: L, life: 0.4, max: 0.4, light: 220 * size });
    // debris chunks
    const count = Math.round(8 + size * 5);
    for (let i = 0; i < count; i++) {
      const c = chunks[chunkNext]; c.idx = chunkNext; chunkNext = (chunkNext + 1) % DEBRIS;
      c.p.copy(at).add(new THREE.Vector3().randomDirection().multiplyScalar(size * 0.5));
      c.v.copy(c.p).sub(at).normalize().multiplyScalar(8 + Math.random() * 18 * (0.5 + size * 0.25));
      if (vel) c.v.add(vel);
      c.rot.set(Math.random() * 6, Math.random() * 6, Math.random() * 6);
      c.spin.set((Math.random() - 0.5) * 9, (Math.random() - 0.5) * 9, (Math.random() - 0.5) * 9);
      c.s = size * (0.16 + Math.random() * 0.26); c.max = c.life = 1.6 + Math.random() * 1.4;
      hot[c.idx] = 1;
    }
  }
  const proj = new THREE.Vector3();
  function explodeRock(r) {
    r.hit = true;
    blast(r.p, r.s, new THREE.Vector3(0, 0, -6));
    pew(90, 0.55, 'sawtooth', 0.07); pew(55, 0.8, 'triangle', 0.08);
    shake = Math.max(shake, 0.18 + r.s * 0.05);
    proj.copy(r.p).project(camera);
    hooks.onRockDown?.({ x: (proj.x + 1) / 2, y: (1 - proj.y) / 2, points: 50 });
  }
  const fireKey = (e) => { if (e.key === 'f' || e.key === 'F') fire(); };
  addEventListener('keydown', fireKey);
  const clickFire = (e) => { if (e.pointerType === 'mouse') fire(); };
  dom.addEventListener('pointerdown', clickFire);

  function startFlight() {
    mode = 'hyper'; t = 0; flightT = 0; score = 0; shield = 100; boost = 100; hyper = 0;
    ship.position.set(0, 0, 40); offset.set(0, 0);
    crystals.forEach((c) => (c.taken = false)); rocks.forEach((r) => (r.hit = false));
    hooks.onHud?.({ score, time: 20, shield, boost });
  }

  function beginDock() {
    mode = 'dock'; dockT = 0;
    const p0 = ship.position.clone();
    dockCurve = new THREE.CatmullRomCurve3([p0, new THREE.Vector3(p0.x * 0.5, mouth.y * 0.4, p0.z - 40), new THREE.Vector3(0, mouth.y - 2, mouth.z + 120), new THREE.Vector3(0, mouth.y, mouth.z + 20), mouth.clone().add(new THREE.Vector3(0, 0, -40))]);
    hooks.onMsg?.('AUTOPILOT ENGAGED');
  }

  function updateHyper(dt) {
    hyper += dt;
    const k = Math.min(1, hyper / 0.5) * (hyper < 1.6 ? 1 : Math.max(0, 1 - (hyper - 1.6) / 0.4));
    streaks.material.opacity = k;
    const len = 30 + k * 120;
    for (let i = 0; i < streakCount; i++) {
      const s = streakSeeds[i];
      s.z += dt * (600 + k * 2400); if (s.z > 30) s.z -= 430;
      const o = i * 6;
      streakPos[o] = camera.position.x + s.x; streakPos[o + 1] = camera.position.y + s.y; streakPos[o + 2] = camera.position.z + s.z - 400;
      streakPos[o + 3] = streakPos[o]; streakPos[o + 4] = streakPos[o + 1]; streakPos[o + 5] = streakPos[o + 2] - len;
    }
    streaks.geometry.attributes.position.needsUpdate = true;
    camera.fov = 62 + k * 28; camera.updateProjectionMatrix();
    ship.position.z -= dt * 20;
    if (hyper > 1.25 && !updateHyper.flashed) { updateHyper.flashed = true; hooks.onFlash?.(); }
    if (hyper > 2.0) { updateHyper.flashed = false; streaks.material.opacity = 0; camera.fov = 62; camera.updateProjectionMatrix(); mode = 'flight'; ship.position.set(0, 0, -20); hooks.onMsg?.('GO'); setTimeout(() => hooks.onMsg?.(''), 900); }
  }

  function updateFlight(dt) {
    flightT += dt;
    // steering input
    let ix = pointer.x, iy = pointer.y;
    if (keys.has('a') || keys.has('arrowleft')) ix = -1; if (keys.has('d') || keys.has('arrowright')) ix = 1;
    if (keys.has('w') || keys.has('arrowup')) iy = 1; if (keys.has('s') || keys.has('arrowdown')) iy = -1;
    target.set(ix * 16, iy * 10);
    offset.lerp(target, 1 - Math.exp(-dt * 3.2));
    const useBoost = boosting && boost > 0;
    boost = THREE.MathUtils.clamp(boost + (useBoost ? -dt * 38 : dt * 14), 0, 100);
    const speed = (useBoost ? 52 : 34) * (ship.position.z < -660 ? 0.4 : 1);
    ship.position.set(offset.x, offset.y, ship.position.z - speed * dt);
    // bank + pitch toward the steering direction
    ship.rotation.z = THREE.MathUtils.lerp(ship.rotation.z, -(target.x - offset.x) * 0.09, 1 - Math.exp(-dt * 6));
    ship.rotation.x = THREE.MathUtils.lerp(ship.rotation.x, (target.y - offset.y) * 0.06, 1 - Math.exp(-dt * 6));
    thrust.intensity = useBoost ? 22 : 8;

    // crystals
    crystals.forEach((c, i) => {
      if (c.taken) return;
      if (c.p.distanceToSquared(ship.position) < 9) { c.taken = true; score += 100; hooks.onCrystal?.(); tmp.position.copy(c.p); tmp.scale.setScalar(0); tmp.updateMatrix(); cinst.setMatrixAt(i, tmp.matrix); cinst.instanceMatrix.needsUpdate = true; }
    });
    // asteroids
    for (const r of rocks) {
      if (r.hit || Math.abs(r.p.z - ship.position.z) > r.r + 3) continue;
      if (r.p.distanceTo(ship.position) < r.r + 1.4) { r.hit = true; blast(r.p, r.s * 0.8); score = Math.max(0, score - 150); shield = Math.max(0, shield - 15); hooks.onHit?.(); shake = 0.6; }
    }
    // lasers vs asteroids
    laserCd -= dt;
    for (let i = lasers.length - 1; i >= 0; i--) {
      const L = lasers[i]; L.m.position.addScaledVector(L.vel, dt); L.life -= dt;
      let hitRock = null;
      for (const r of rocks) { if (!r.hit && Math.abs(r.p.z - L.m.position.z) < r.r + 3 && r.p.distanceTo(L.m.position) < r.r + 1) { hitRock = r; break; } }
      if (hitRock) { score += 50; explodeRock(hitRock); }
      if (hitRock || L.life <= 0) { L.m.removeFromParent(); lasers.splice(i, 1); }
    }
    hooks.onHud?.({ score, time: 20 - flightT, shield, boost });
    if (flightT >= 20) beginDock();
  }

  let shake = 0;
  function updateFx(dt) {
    for (let i = fx.length - 1; i >= 0; i--) {
      const f = fx[i]; f.life -= dt; const k = Math.max(0, f.life / f.max), e = 1 - k;
      if (f.light) f.o.intensity = f.light * k * k;
      else {
        if (f.grow) f.o.scale.setScalar(f.o.scale.x + (f.grow - f.o.scale.x) * Math.min(1, dt * (f.ring ? 6 : 9)));
        f.o.material.opacity = f.ring ? k * 0.9 : Math.min(1, k * 1.6) * (1 - e * e * 0.3);
      }
      if (f.life <= 0) { f.o.removeFromParent(); f.o.material?.dispose(); fx.splice(i, 1); }
    }
    let any = false;
    const col = new THREE.Color();
    for (const c of chunks) {
      if (c.life <= 0) continue; any = true;
      c.life -= dt; c.v.multiplyScalar(1 - dt * 0.35);
      c.p.addScaledVector(c.v, dt); c.rot.x += c.spin.x * dt; c.rot.y += c.spin.y * dt; c.rot.z += c.spin.z * dt;
      const k = Math.max(0, c.life / c.max);
      tmp.position.copy(c.p); tmp.rotation.copy(c.rot); tmp.scale.setScalar(c.life > 0 ? c.s * Math.min(1, k * 4) : 0); tmp.updateMatrix();
      debrisMesh.setMatrixAt(c.idx, tmp.matrix);
      hot[c.idx] = Math.max(0, hot[c.idx] - dt * 2);
      const hk = hot[c.idx]; col.setRGB(1 + hk * 2.5, 1 + hk * 0.6, 1); debrisMesh.setColorAt(c.idx, col);
    }
    if (any) { debrisMesh.instanceMatrix.needsUpdate = true; debrisMesh.instanceColor.needsUpdate = true; }
  }
  function updateDock(dt) {
    dockT = Math.min(1, dockT + dt / 5.5);
    const e = dockT < 0.5 ? 4 * dockT ** 3 : 1 - Math.pow(-2 * dockT + 2, 3) / 2;
    const p = dockCurve.getPointAt(e), tan = dockCurve.getTangentAt(e);
    ship.position.copy(p);
    ship.lookAt(p.clone().add(tan)); ship.rotateY(Math.PI);
    if (dockT >= 1 && mode === 'dock') { mode = 'done'; hooks.onDocked?.({ score, shield }); }
  }

  function update(dt, time) {
    t += dt;
    // rocks tumble
    for (const r of rocks) { if (Math.abs(r.p.z - camera.position.z) > 260) continue; r.rot.x += r.spin.x * dt; r.rot.y += r.spin.y * dt; tmp.position.copy(r.p); tmp.rotation.copy(r.rot); tmp.scale.setScalar(r.hit ? 0.001 : r.s); tmp.updateMatrix(); r.inst.setMatrixAt(r.i, tmp.matrix); }
    rocks.forEach((r) => (r.inst.instanceMatrix.needsUpdate = true));
    // crystals spin
    crystals.forEach((c, i) => { if (c.taken) return; tmp.position.copy(c.p); tmp.position.y += Math.sin(time * 2 + i) * 0.3; tmp.rotation.set(0, time * 2 + i, 0.4); tmp.scale.setScalar(1 + Math.sin(time * 4 + i) * 0.12); tmp.updateMatrix(); cinst.setMatrixAt(i, tmp.matrix); });
    cinst.instanceMatrix.needsUpdate = true;
    station.rotation.z = 0; // keep docking geometry stable

    updateFx(dt);
    for (let i = blasts.length - 1; i >= 0; i--) {
      const b = blasts[i]; b.life -= dt; const p = b.pts.geometry.attributes.position;
      for (let k = 0; k < b.vel.length; k++) p.setXYZ(k, p.getX(k) + b.vel[k].x * dt, p.getY(k) + b.vel[k].y * dt, p.getZ(k) + b.vel[k].z * dt);
      p.needsUpdate = true; b.pts.material.opacity = Math.max(0, b.life / 0.9);
      if (b.life <= 0) { b.pts.removeFromParent(); blasts.splice(i, 1); }
    }
    if (mode === 'intro') {
      const a = t * 0.035;
      camera.position.set(Math.sin(a) * 260 + 60, 70 + Math.sin(t * 0.1) * 12, mouth.z + 380 + Math.cos(a) * 120);
      camera.lookAt(0, 40, -900);
      ship.position.set(camera.position.x - 30, camera.position.y - 14, camera.position.z - 70);
      ship.rotation.set(0, 0.6, Math.sin(t * 0.6) * 0.15);
      return;
    }
    if (mode === 'hyper') updateHyper(dt);
    else if (mode === 'flight') updateFlight(dt);
    else if (mode === 'dock' || mode === 'done') updateDock(dt);

    // chase camera
    const back = mode === 'dock' || mode === 'done' ? 16 : 11;
    camPos.set(ship.position.x * 0.85, ship.position.y + 3.2, ship.position.z + back);
    camera.position.lerp(camPos, 1 - Math.exp(-dt * 5));
    if (shake > 0) { shake -= dt; camera.position.x += (Math.random() - 0.5) * shake; camera.position.y += (Math.random() - 0.5) * shake; }
    camTarget.set(ship.position.x * 0.6, ship.position.y + 1, ship.position.z - 30);
    camera.lookAt(camTarget);
  }

  return {
    scene, update, startFlight, fire,
    bloom: { strength: 0.55, radius: 0.45, threshold: 0.86 },
    setPilot(p) { /* livery is fixed at creation of the space scene */ },
    get mode() { return mode; },
    setBoost(v) { boosting = v; },
    dispose() { removeEventListener('keydown', fireKey); dom.removeEventListener('pointerdown', clickFire); removeEventListener('keydown', kd); removeEventListener('keyup', ku); dom.removeEventListener('pointermove', pm); dom.removeEventListener('pointerdown', pd); removeEventListener('pointerup', pu); },
  };
}
