// First-person blaster: viewmodel, bolts, impact sparks, training drones and a tiny synth "pew".
import * as THREE from 'three';

let actx = null;
export function pew(freq = 880, dur = 0.12, type = 'square', vol = 0.05) {
  try {
    actx = actx || new AudioContext();
    const t = actx.currentTime, o = actx.createOscillator(), g = actx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t); o.frequency.exponentialRampToValueAtTime(freq * 0.25, t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(actx.destination); o.start(t); o.stop(t + dur + 0.02);
  } catch { /* audio unavailable */ }
}

function buildBlaster(color) {
  const g = new THREE.Group();
  const body = new THREE.MeshStandardMaterial({ color: 0x1c2028, metalness: 0.85, roughness: 0.3 });
  const plate = new THREE.MeshStandardMaterial({ color: 0xc9ced8, metalness: 0.5, roughness: 0.35 });
  const glow = new THREE.MeshBasicMaterial({ color, toneMapped: false });
  const add = (geo, mat, x, y, z, rx = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.x = rx; g.add(m); return m; };
  add(new THREE.BoxGeometry(0.07, 0.09, 0.34), body, 0, 0, 0);
  add(new THREE.BoxGeometry(0.072, 0.03, 0.22), plate, 0, 0.055, -0.02);
  add(new THREE.CylinderGeometry(0.022, 0.026, 0.2, 16), body, 0, 0.01, -0.25, Math.PI / 2);
  add(new THREE.CylinderGeometry(0.03, 0.03, 0.03, 16), plate, 0, 0.01, -0.35, Math.PI / 2);
  add(new THREE.BoxGeometry(0.055, 0.15, 0.07), body, 0, -0.1, 0.09, 0.25);
  add(new THREE.BoxGeometry(0.074, 0.012, 0.16), glow, 0, 0.027, -0.04);
  const muzzle = add(new THREE.SphereGeometry(0.05, 12, 8), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0, toneMapped: false }), 0, 0.01, -0.39);
  g.userData.muzzle = muzzle;
  return g;
}

export function createWeapons(engine, { color = '#6fd3ff', onDroneDown } = {}) {
  const cam = engine.camera;
  const col = new THREE.Color(color);
  const view = buildBlaster(col);
  view.scale.setScalar(0.42);
  const boltGeo = new THREE.CapsuleGeometry(0.035, 0.5, 4, 8); boltGeo.rotateX(Math.PI / 2);
  const boltMat = new THREE.MeshBasicMaterial({ color: col.clone().multiplyScalar(2.2), toneMapped: false });
  const bolts = [], sparks = [];
  const ray = new THREE.Raycaster();
  let scene = null, armed = false, recoil = 0, cooldown = 0, drones = [], solids = [];

  function attach(s, { armed: a = true, droneSpots = [] } = {}) {
    view.removeFromParent();
    bolts.forEach((b) => b.mesh.removeFromParent()); bolts.length = 0;
    drones.forEach((d) => d.group.removeFromParent()); drones = [];
    scene = s; armed = a;
    if (armed) scene.add(view);
    solids = []; scene.traverse((o) => { if (o.isMesh && !o.isReflector && !(o.material?.transparent && o.material.blending === THREE.AdditiveBlending)) solids.push(o); });
    droneSpots.forEach((p, i) => drones.push(makeDrone(p, i)));
  }

  function makeDrone(home, i) {
    const group = new THREE.Group();
    const shell = new THREE.Mesh(new THREE.SphereGeometry(0.42, 24, 16), new THREE.MeshStandardMaterial({ color: 0x2a2f38, metalness: 0.8, roughness: 0.3 }));
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.05, 8, 40), new THREE.MeshStandardMaterial({ color: 0xc9ced8, metalness: 0.6, roughness: 0.3 }));
    ring.rotation.x = Math.PI / 2;
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.13, 16, 12), new THREE.MeshBasicMaterial({ color: 0xff4d3a, toneMapped: false }));
    eye.position.z = 0.36;
    group.add(shell, ring, eye); group.position.copy(home); scene.add(group);
    return { group, home: home.clone(), phase: i * 1.7, alive: true, respawn: 0, hitbox: shell };
  }

  function sparkBurst(at, color = col, n = 40) {
    const pos = new Float32Array(n * 3), vel = [];
    for (let i = 0; i < n; i++) { pos[i * 3] = at.x; pos[i * 3 + 1] = at.y; pos[i * 3 + 2] = at.z; vel.push(new THREE.Vector3().randomDirection().multiplyScalar(2 + Math.random() * 5)); }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const pts = new THREE.Points(geo, new THREE.PointsMaterial({ color, size: 0.06, transparent: true, opacity: 1, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
    scene.add(pts);
    const flash = new THREE.PointLight(color, 25, 6, 2); flash.position.copy(at); scene.add(flash);
    sparks.push({ pts, vel, life: 0.6, flash });
  }

  function fire() {
    if (!armed || cooldown > 0 || !scene) return;
    cooldown = 0.16; recoil = 1;
    const dir = new THREE.Vector3(); cam.getWorldDirection(dir);
    const start = new THREE.Vector3(0.16, -0.14, -0.55).applyQuaternion(cam.quaternion).add(cam.position);
    const mesh = new THREE.Mesh(boltGeo, boltMat); mesh.position.copy(start); mesh.lookAt(start.clone().add(dir)); scene.add(mesh);
    // aim at what the crosshair sees
    ray.set(cam.position, dir); ray.far = 120;
    const targets = drones.filter((d) => d.alive).map((d) => d.hitbox).concat(solids);
    const hit = ray.intersectObjects(targets, false)[0];
    const end = hit ? hit.point : cam.position.clone().addScaledVector(dir, 120);
    const vel = end.clone().sub(start).normalize().multiplyScalar(70);
    bolts.push({ mesh, vel, dist: start.distanceTo(end), travelled: 0, hit });
    pew(980, 0.14, 'square', 0.035);
  }

  // input: F key or a click that was not a drag (the drag looks around)
  const onKey = (e) => { if (e.key === 'f' || e.key === 'F') fire(); };
  addEventListener('keydown', onKey);
  const dom = engine.renderer.domElement;
  let downX = 0, downY = 0;
  const pd = (e) => { downX = e.clientX; downY = e.clientY; };
  const pu = (e) => { if (e.pointerType === 'mouse' && Math.hypot(e.clientX - downX, e.clientY - downY) < 6) fire(); };
  dom.addEventListener('pointerdown', pd); dom.addEventListener('pointerup', pu);

  const tmpQ = new THREE.Quaternion();
  function update(dt, time) {
    cooldown -= dt;
    if (armed) {
      recoil = Math.max(0, recoil - dt * 7);
      const bob = Math.sin(time * 2.2) * 0.004;
      const off = new THREE.Vector3(0.16, -0.15 + bob + recoil * 0.008, -0.38 + recoil * 0.03).applyQuaternion(cam.quaternion);
      view.position.copy(cam.position).add(off);
      tmpQ.setFromEuler(new THREE.Euler(recoil * 0.25, -0.05, 0)); view.quaternion.copy(cam.quaternion).multiply(tmpQ);
      view.userData.muzzle.material.opacity = recoil > 0.6 ? 1 : 0;
    }
    for (let i = bolts.length - 1; i >= 0; i--) {
      const b = bolts[i]; const step = b.vel.length() * dt;
      b.mesh.position.addScaledVector(b.vel, dt); b.travelled += step;
      if (b.travelled >= b.dist) {
        if (b.hit) {
          const d = drones.find((x) => x.alive && x.hitbox === b.hit.object);
          if (d) { d.alive = false; d.respawn = 6; d.group.visible = false; sparkBurst(d.group.position, new THREE.Color(0xff8a2a), 90); pew(140, 0.5, 'sawtooth', 0.06); onDroneDown?.(); }
          else sparkBurst(b.hit.point);
        }
        b.mesh.removeFromParent(); bolts.splice(i, 1);
      }
    }
    for (let i = sparks.length - 1; i >= 0; i--) {
      const s = sparks[i]; s.life -= dt;
      const p = s.pts.geometry.attributes.position;
      for (let k = 0; k < s.vel.length; k++) { s.vel[k].y -= dt * 9; p.setXYZ(k, p.getX(k) + s.vel[k].x * dt, p.getY(k) + s.vel[k].y * dt, p.getZ(k) + s.vel[k].z * dt); }
      p.needsUpdate = true; s.pts.material.opacity = Math.max(0, s.life / 0.6); s.flash.intensity = Math.max(0, s.life - 0.4) * 120;
      if (s.life <= 0) { s.pts.removeFromParent(); s.flash.removeFromParent(); sparks.splice(i, 1); }
    }
    drones.forEach((d) => {
      if (!d.alive) { d.respawn -= dt; if (d.respawn <= 0) { d.alive = true; d.group.visible = true; } return; }
      const t = time * 0.6 + d.phase;
      d.group.position.set(d.home.x + Math.sin(t) * 3, d.home.y + Math.sin(t * 2) * 0.6, d.home.z + Math.cos(t * 0.7) * 2);
      d.group.lookAt(cam.position);
    });
  }

  return {
    attach, update, fire,
    get armed() { return armed; },
    dispose() { removeEventListener('keydown', onKey); dom.removeEventListener('pointerdown', pd); dom.removeEventListener('pointerup', pu); },
  };
}
