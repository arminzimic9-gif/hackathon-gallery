// First-person walker: WASD/arrows + drag-to-look on desktop, joystick + drag on touch.
import * as THREE from 'three';

export function createPlayer(camera, dom, joyEl) {
  const pos = new THREE.Vector3(0, 1.7, 0);
  let yaw = 0, pitch = 0, enabled = false;
  let bounds = null, boxes = [], circle = null;
  const keys = new Set();
  const vel = new THREE.Vector3();
  let bob = 0, velY = 0, height = 0;   // height = jump offset above the eye level
  const RADIUS = 0.4;

  const onKey = (e, down) => {
    const k = e.key.toLowerCase();
    if (k === ' ' && down && enabled) { jump(); e.preventDefault(); return; }
    if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'shift'].includes(k)) {
      down ? keys.add(k) : keys.delete(k);
      if (enabled) e.preventDefault();
    }
  };
  const kd = (e) => onKey(e, true), ku = (e) => onKey(e, false);
  addEventListener('keydown', kd); addEventListener('keyup', ku);

  // drag to look (mouse or any touch not on the joystick)
  let dragId = null, lx = 0, ly = 0, moved = 0;
  dom.addEventListener('pointerdown', (e) => {
    if (!enabled || e.target !== dom) return;
    dragId = e.pointerId; lx = e.clientX; ly = e.clientY; moved = 0;
    dom.setPointerCapture(e.pointerId);
  });
  dom.addEventListener('pointermove', (e) => {
    if (e.pointerId !== dragId) return;
    const dx = e.clientX - lx, dy = e.clientY - ly;
    lx = e.clientX; ly = e.clientY; moved += Math.abs(dx) + Math.abs(dy);
    const s = e.pointerType === 'touch' ? 0.006 : 0.0035;
    yaw -= dx * s; pitch = THREE.MathUtils.clamp(pitch - dy * s, -1.2, 1.2);
  });
  const end = (e) => { if (e.pointerId === dragId) dragId = null; };
  dom.addEventListener('pointerup', end); dom.addEventListener('pointercancel', end);

  // virtual joystick
  const joy = { x: 0, y: 0, id: null };
  if (joyEl) {
    const knob = joyEl.querySelector('i');
    const setKnob = () => { knob.style.transform = `translate(${joy.x * 36}px, ${joy.y * 36}px)`; };
    joyEl.addEventListener('pointerdown', (e) => { joy.id = e.pointerId; joyEl.setPointerCapture(e.pointerId); move(e); });
    const move = (e) => {
      if (e.pointerId !== joy.id) return;
      const r = joyEl.getBoundingClientRect();
      let x = (e.clientX - (r.left + r.width / 2)) / (r.width / 2), y = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
      const l = Math.hypot(x, y); if (l > 1) { x /= l; y /= l; }
      joy.x = x; joy.y = y; setKnob();
    };
    joyEl.addEventListener('pointermove', move);
    const stop = (e) => { if (e.pointerId === joy.id) { joy.id = null; joy.x = joy.y = 0; setKnob(); } };
    joyEl.addEventListener('pointerup', stop); joyEl.addEventListener('pointercancel', stop);
  }

  function jump() { if (height <= 0.001) velY = 5.4; }

  function collide(p) {
    if (circle) {
      const dx = p.x - circle.cx, dz = p.z - circle.cz, d = Math.hypot(dx, dz), max = circle.r - RADIUS;
      if (d > max) { p.x = circle.cx + dx / d * max; p.z = circle.cz + dz / d * max; }
    }
    if (bounds) {
      p.x = THREE.MathUtils.clamp(p.x, bounds.min[0] + RADIUS, bounds.max[0] - RADIUS);
      p.z = THREE.MathUtils.clamp(p.z, bounds.min[2] + RADIUS, bounds.max[2] - RADIUS);
    }
    for (const b of boxes) {
      const minx = b.min[0] - RADIUS, maxx = b.max[0] + RADIUS, minz = b.min[2] - RADIUS, maxz = b.max[2] + RADIUS;
      if (p.x > minx && p.x < maxx && p.z > minz && p.z < maxz) {
        const dl = p.x - minx, dr = maxx - p.x, dn = p.z - minz, df = maxz - p.z;
        const m = Math.min(dl, dr, dn, df);
        if (m === dl) p.x = minx; else if (m === dr) p.x = maxx; else if (m === dn) p.z = minz; else p.z = maxz;
      }
    }
  }

  const fwd = new THREE.Vector3(), right = new THREE.Vector3(), want = new THREE.Vector3();
  function update(dt) {
    if (enabled) {
      let f = 0, s = 0;
      if (keys.has('w') || keys.has('arrowup')) f += 1;
      if (keys.has('s') || keys.has('arrowdown')) f -= 1;
      if (keys.has('d')) s += 1;
      if (keys.has('a')) s -= 1;
      if (keys.has('arrowleft')) yaw += dt * 1.8;
      if (keys.has('arrowright')) yaw -= dt * 1.8;
      f -= joy.y; s += joy.x;
      const speed = keys.has('shift') ? 7.5 : 4.2;
      fwd.set(-Math.sin(yaw), 0, -Math.cos(yaw));
      right.set(Math.cos(yaw), 0, -Math.sin(yaw));
      want.copy(fwd).multiplyScalar(f).addScaledVector(right, s);
      if (want.lengthSq() > 1) want.normalize();
      want.multiplyScalar(speed);
      vel.lerp(want, 1 - Math.exp(-dt * 9));     // eased acceleration, no linear stops
      pos.addScaledVector(vel, dt);
      collide(pos);
      bob += vel.length() * dt * 1.7;
    }
    if (velY !== 0 || height > 0) {
      velY -= 15 * dt; height += velY * dt;
      if (height <= 0) { height = 0; velY = 0; }
    }
    const sway = Math.sin(performance.now() / 2600) * 0.006;   // the camera breathes
    camera.position.set(pos.x, pos.y + height + (height > 0 ? 0 : Math.sin(bob * 2) * 0.035 * Math.min(1, vel.length() / 4)), pos.z);
    camera.rotation.set(pitch + sway, yaw, 0, 'YXZ');
  }

  return {
    pos, update, jump,
    get yaw() { return yaw; }, set yaw(v) { yaw = v; },
    get pitch() { return pitch; }, set pitch(v) { pitch = v; },
    get dragDistance() { return moved; },
    setEnabled(v) { enabled = v; if (!v) { vel.set(0, 0, 0); keys.clear(); } },
    setWorld({ walk = null, obstacles = [], circle: c = null }) { bounds = walk; boxes = obstacles; circle = c; },
    place(p, lookYaw = 0) { pos.set(p[0], p[1] ?? 1.7, p[2]); yaw = lookYaw; pitch = 0; vel.set(0, 0, 0); },
    dispose() { removeEventListener('keydown', kd); removeEventListener('keyup', ku); },
  };
}
