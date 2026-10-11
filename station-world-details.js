import * as THREE from 'three';

export const WORLD_DETAILS_CSS = `
.hs-discovery {
  position: absolute; z-index: 8; left: max(20px, var(--mobius-safe-left, 0px));
  bottom: max(84px, calc(64px + var(--mobius-safe-bottom, 0px)));
  width: min(320px, calc(100vw - 40px)); padding: 16px 18px 17px;
  color: var(--ink); background: var(--paper);
  border: 0; border-left: 4px solid var(--orange);
  box-shadow: 0 18px 40px rgba(0,0,0,.28);
  font-family: var(--font); pointer-events: none; opacity: 0;
  transform: translateY(12px); transition: opacity .24s ease, transform .24s ease;
}
.hs-discovery.is-visible { opacity: 1; transform: translateY(0); }
.hs-discovery-kicker { display: inline-block; padding: 5px 8px 5px 10px; color: #fff; background: var(--tag); font: 500 10px/1 var(--font); letter-spacing: .22em; text-transform: uppercase; }
.hs-discovery strong { display: -webkit-box; margin: 9px 0 8px; font: 500 clamp(18px, 2vw, 24px)/1.13 var(--font); overflow: hidden; overflow-wrap: anywhere; -webkit-box-orient: vertical; -webkit-line-clamp: 2; }
.hs-discovery-meta { color: var(--ink); font: 600 11px/1.4 var(--font); letter-spacing: .04em; }
.hs-discovery p { display: -webkit-box; margin: 7px 0 0; color: var(--ink-2); font: 400 12px/1.5 var(--font); overflow: hidden; -webkit-box-orient: vertical; -webkit-line-clamp: 3; }
body:has(.hs-overlay) .hs-discovery { display: none; }
#station-root.hs-docking .st-flight .msg {
  top: 28px; transform: translateX(-50%); padding: 9px 14px;
  color: #e8fbff; background: #061827d9; border: 1px solid #77e8ffb8;
  box-shadow: 0 0 24px #18cffa44;
  font: 700 14px/1.2 var(--font); letter-spacing: .2em; white-space: nowrap;
}
@media (max-width: 760px) {
  .hs-discovery { left: 12px; bottom: max(238px, calc(216px + var(--mobius-safe-bottom, 0px))); width: min(330px, calc(100vw - 24px)); padding: 11px 13px 12px; }
  .hs-discovery strong { font-size: 17px; margin: 3px 0 5px; }
  .hs-discovery p { font-size: 11px; margin-top: 4px; }
  #station-root.hs-docking .st-flight .msg { top: 84px; font-size: 11px; padding: 7px 9px; }
}
@media (prefers-reduced-motion: reduce) { .hs-discovery { transition: none; } }
`;

function arrivalGate(scene) {
  if (!scene.getObjectByName('STATION') || scene.userData.hsArrivalGate) return null;
  const gate = new THREE.Group();
  gate.name = 'HS_ARRIVAL_GATE';
  gate.position.set(0, 20, -782);
  const field = new THREE.Mesh(new THREE.PlaneGeometry(39.5, 17.5), new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 } }, transparent: true, depthWrite: false,
    blending: THREE.AdditiveBlending, side: THREE.DoubleSide, toneMapped: false,
    vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `uniform float uTime; varying vec2 vUv;
      void main() {
        float sweep = sin(vUv.x * 15.0 - uTime * 1.7 + vUv.y * 5.0) * 0.5 + 0.5;
        float ribs = pow(max(0.0, sin(vUv.x * 85.0 + uTime * 0.8)), 12.0);
        float edge = pow(abs(vUv.x * 2.0 - 1.0), 3.0);
        vec3 cyan = vec3(0.04, 0.88, 1.0), pink = vec3(1.0, 0.08, 0.72), amber = vec3(1.0, 0.53, 0.08);
        vec3 color = mix(cyan, pink, smoothstep(0.15, 0.85, vUv.x));
        color = mix(color, amber, sweep * 0.32 + ribs * 0.22);
        gl_FragColor = vec4(color, 0.12 + edge * 0.12 + sweep * 0.09 + ribs * 0.08);
      }`,
  }));
  field.position.z = 0.12;
  gate.add(field);

  const bars = [];
  function bar(x, y, w, h, color, opacity, z = 0.4) {
    const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
    mesh.position.set(x, y, z); gate.add(mesh); bars.push(mesh);
  }
  for (const [side, color] of [[-1, 0x08e9ff], [1, 0xff37ca]]) {
    bar(side * 20.2, 0, 1.75, 21.5, color, 0.15);
    bar(side * 20.2, 0, 0.34, 20.5, color, 0.98, 0.5);
  }
  bar(0, 10.25, 41.0, 0.32, 0xffb74b, 0.96, 0.5);
  bar(0, -10.25, 41.0, 0.32, 0x21eeff, 0.96, 0.5);
  bar(0, 10.25, 42, 1.8, 0xffae38, 0.12);
  bar(0, -10.25, 42, 1.8, 0x13caff, 0.12);
  for (const side of [-1, 1]) for (let i = 0; i < 7; i++) {
    bar(side * 20.2, -8 + i * 2.7, 0.95, 0.34, i % 2 ? 0xffc44d : 0xe5faff, 0.9, 0.7);
  }
  const cornerMaterial = new THREE.MeshBasicMaterial({ color: 0xffe1a0, transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
  for (const x of [-20.2, 20.2]) for (const y of [-10.25, 10.25]) {
    const corner = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.5), cornerMaterial);
    corner.position.set(x, y, 0.8); gate.add(corner);
  }
  scene.add(gate);
  scene.userData.hsArrivalGate = gate;
  return { gate, field, bars };
}

function sceneTargets(scene) {
  scene.updateMatrixWorld(true);
  const trophies = [1, 2, 3].map(place => scene.getObjectByName(`TROPHY_SLOT_${place}`));
  if (trophies.some(Boolean)) {
    const targets = trophies.map((slot, i) => slot && ({
      id: `trophy-${i + 1}`, place: i + 1,
      position: slot.getWorldPosition(new THREE.Vector3()), radius: 3.8,
    })).filter(Boolean);
    targets.push({ id: 'holotable', position: new THREE.Vector3(0, 1, 6.5), radius: 3.5 });
    return targets;
  }
  const targets = [];
  scene.traverse(object => {
    if (!object.isMesh || !object.userData?.art) return;
    targets.push({ id: `art-${object.uuid}`, item: object.userData.art,
      position: object.getWorldPosition(new THREE.Vector3()), radius: 4.4 });
  });
  return targets;
}

function cardData(target, winners) {
  if (target.place) {
    const item = winners[target.place - 1];
    return item ? {
      kicker: `COMMAND BRIDGE · PLACE ${target.place}`,
      title: item.title,
      meta: item.author ? `Artwork by ${item.author}` : 'Artwork creator not listed',
      description: 'Award trophy and finalist hologram. The winner is revealed in the Ceremony Hall.',
    } : {
      kicker: `COMMAND BRIDGE · PLACE ${target.place}`,
      title: `Place ${target.place} trophy`,
      meta: 'Station concept & art direction · Armin Zimić',
      description: 'The winner is not yet announced. This trophy is generated by the supplied station code.',
    };
  }
  if (target.item) return {
    kicker: target.item.sample ? 'SAMPLE EXHIBIT' : 'GALLERY EXHIBIT',
    title: target.item.title || 'Untitled artwork',
    meta: target.item.author ? `Creator · ${target.item.author}` : 'Creator not listed',
    description: target.item.caption || 'A piece from the curated Station collection.',
  };
  return {
    kicker: 'COMMAND BRIDGE · HOLO-TABLE', title: 'Finalists holo-table',
    meta: 'Station concept & art direction · Armin Zimić',
    description: 'Explore the finalists here, then enter the Ceremony Hall.',
  };
}

export function installStationWorldDetails(station, root, winners = []) {
  const { engine, player } = station;
  const originalSetScene = engine.setScene;
  const card = document.createElement('aside');
  card.className = 'hs-discovery'; card.setAttribute('role', 'status'); card.setAttribute('aria-live', 'polite');
  const kicker = document.createElement('span'); kicker.className = 'hs-discovery-kicker';
  const title = document.createElement('strong');
  const meta = document.createElement('div'); meta.className = 'hs-discovery-meta';
  const description = document.createElement('p');
  card.append(kicker, title, meta, description); root.appendChild(card);
  const gates = [];
  let targets = [], currentId = '', frame, lastCheck = 0, activeGate = null;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

  function activate(scene) {
    if (!scene) return;
    let gate = scene.userData.hsArrivalGate && gates.find(x => x.gate === scene.userData.hsArrivalGate);
    if (!gate) { gate = arrivalGate(scene); if (gate) gates.push(gate); }
    activeGate = gate || null;
    targets = sceneTargets(scene);
    currentId = ''; card.classList.remove('is-visible');
  }
  engine.setScene = scene => { originalSetScene(scene); activate(scene.scene); };
  activate(engine.composer.passes[0]?.scene);

  function tick(now) {
    frame = requestAnimationFrame(tick);
    if (activeGate && !reducedMotion.matches) {
      const t = now / 1000;
      activeGate.field.material.uniforms.uTime.value = t;
      activeGate.bars[0].material.opacity = 0.12 + Math.sin(t * 1.7) * 0.035;
      activeGate.bars[2].material.opacity = 0.12 + Math.sin(t * 1.7 + 1.8) * 0.035;
    }
    if (now - lastCheck < 140) return;
    lastCheck = now;
    root.classList.toggle('hs-docking', root.querySelector('.st-flight .msg')?.textContent?.trim() === 'AUTOPILOT ENGAGED');
    let closest = null, distance = Infinity;
    if (root.querySelector('.st-hud')) for (const target of targets) {
      const dx = target.position.x - player.pos.x, dz = target.position.z - player.pos.z;
      const d = Math.hypot(dx, dz);
      const facing = d < 0.4 || (dx * -Math.sin(player.yaw) + dz * -Math.cos(player.yaw)) / d > -0.05;
      if (facing && d < target.radius && d < distance) { closest = target; distance = d; }
    }
    if (!closest) {
      if (currentId) { currentId = ''; card.classList.remove('is-visible'); }
      return;
    }
    if (closest.id === currentId) return;
    currentId = closest.id;
    const data = cardData(closest, winners);
    kicker.textContent = data.kicker;
    title.textContent = data.title;
    meta.textContent = data.meta;
    description.textContent = data.description;
    card.classList.add('is-visible');
  }
  frame = requestAnimationFrame(tick);
  return { dispose() {
    cancelAnimationFrame(frame);
    if (engine.setScene !== originalSetScene) engine.setScene = originalSetScene;
    for (const { gate } of gates) {
      gate.removeFromParent();
      gate.traverse(o => { o.geometry?.dispose(); o.material?.dispose(); });
    }
    root.classList.remove('hs-docking');
    card.remove();
  } };
}
