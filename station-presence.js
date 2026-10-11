// Opt-in, near-live room presence. The supplied station remains untouched:
// this adapter watches its scene swaps and decorates the current walkable scene.
import * as THREE from 'three';
import { cleanCallsign, loadPilotModel, VISORS } from './src/pilot.js';
import { classifyScene } from './station-score.js';
import { publicRequest } from './station-service.js';

const ROOMS = new Set(['hangar', 'gallery', 'bridge', 'ceremony']);
const UPDATE_MS = 8000;

export const PRESENCE_CSS = `
.hs-presence-help { max-width: 190px; padding: 8px 10px; background: var(--paper); color: var(--ink-2); border-left: 3px solid var(--orange); font: 400 11px/1.4 var(--font); }
.hs-presence-chip { position: fixed; z-index: 12; left: 50%; transform: translateX(-50%); bottom: max(22px,var(--mobius-safe-bottom,0px)); padding: 8px 11px; color: var(--ink); background: var(--paper); border-left: 3px solid var(--orange); box-shadow: 0 12px 32px #0008; font: 600 10px/1.3 var(--font); letter-spacing: .08em; pointer-events: none; }
body:has(.hs-overlay,.st-intro,.st-creator,.st-flight) .hs-presence-chip { display: none; }
@media (max-width: 760px) { .hs-presence-chip { left: auto; transform: none; bottom: auto; top: max(74px,calc(62px + var(--mobius-safe-top,0px))); right: 10px; font-size: 9px; } }
`;

export function roomForScene(wrapper) {
  const room = classifyScene(wrapper);
  return ROOMS.has(room) ? room : null;
}

function pilotSnapshot(storage) {
  let pilot;
  try { pilot = JSON.parse(storage?.getItem('hs.pilot') || 'null'); } catch { pilot = null; }
  const bounded = (value, max) => Number.isInteger(value) && value >= 0 && value <= max ? value : 0;
  return {
    callsign: cleanCallsign(pilot?.callsign) || 'PILOT',
    helmet: bounded(pilot?.helmet, 2), suit: bounded(pilot?.suit, 5), visor: bounded(pilot?.visor, 3),
  };
}

function nameTag(name, color) {
  const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 112;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = 'rgba(5, 17, 29, .92)'; ctx.fillRect(2, 2, 508, 108);
  ctx.strokeStyle = color; ctx.lineWidth = 5; ctx.strokeRect(3, 3, 506, 106);
  ctx.fillStyle = '#f4fbff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = '700 46px sans-serif'; ctx.fillText(name, 256, 57, 480);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false }));
  sprite.position.y = 2.2; sprite.scale.set(2.7, .59, 1);
  return sprite;
}

function releaseModel(model) {
  if (!model) return;
  model.mixer.stopAllAction(); model.mixer.uncacheRoot(model.root);
  // SkeletonUtils clones reuse GLTF geometry/textures, but tintMaterial clones
  // each mesh material. Dispose only those clone-owned materials.
  model.root.traverse(object => {
    if (object.isMesh && object.material?.userData?.uSuit) object.material.dispose();
  });
}

export function installStationPresence(station, { assetUrl, storage, onState = () => {} }) {
  const { engine, player } = station;
  const originalSetScene = engine.setScene;
  const secret = Array.from(crypto.getRandomValues(new Uint8Array(16)), byte => byte.toString(16).padStart(2, '0')).join('');
  let enabled = false, disposed = false, generation = 0, room = null, scene = null;
  let timer = 0, frame = 0, lastFrame = 0, requests = Promise.resolve();
  const peers = new Map();

  function state(phase, online = 0) { onState({ enabled, phase, room, online, shown: peers.size }); }
  function queued(body) {
    const next = requests.then(() => publicRequest('presence', body));
    requests = next.catch(() => {});
    return next;
  }
  function removePeer(id) {
    const peer = peers.get(id); if (!peer) return;
    peers.delete(id); peer.group.removeFromParent();
    peer.tag.material.map.dispose(); peer.tag.material.dispose();
    releaseModel(peer.model);
  }
  function clearPeers() { for (const id of peers.keys()) removePeer(id); }
  function makePeer(data) {
    const group = new THREE.Group();
    group.name = 'HS_REMOTE_PILOT_' + data.id;
    group.userData.hsPresence = true;
    group.position.set(data.x, 0, data.z); group.rotation.y = data.yaw;
    const tag = nameTag(data.callsign, VISORS[data.visor]); group.add(tag);
    scene.add(group);
    const peer = { group, tag, model: null, target: new THREE.Vector3(data.x, 0, data.z), yaw: data.yaw,
      appearance: `${data.helmet}:${data.suit}:${data.visor}` };
    peers.set(data.id, peer);
    loadPilotModel(assetUrl, data).then(model => {
      if (disposed || peers.get(data.id) !== peer) { releaseModel(model); return; }
      peer.model = model; group.add(model.root);
    }).catch(() => { /* The callsign remains visible if a model cannot load. */ });
    return peer;
  }
  function applyRoster(rows) {
    const seen = new Set();
    for (const data of rows) {
      if (!data || !/^[0-9a-f]{24}$/.test(data.id || '') ||
          !Number.isFinite(data.x) || !Number.isFinite(data.z) || !Number.isFinite(data.yaw) ||
          !Number.isInteger(data.helmet) || !Number.isInteger(data.suit) || !Number.isInteger(data.visor) ||
          data.helmet < 0 || data.helmet > 2 || data.suit < 0 || data.suit > 5 || data.visor < 0 || data.visor > 3) continue;
      seen.add(data.id);
      const appearance = `${data.helmet}:${data.suit}:${data.visor}`;
      let peer = peers.get(data.id);
      if (peer && peer.appearance !== appearance) { removePeer(data.id); peer = null; }
      if (!peer) peer = makePeer(data);
      peer.target.set(data.x, 0, data.z); peer.yaw = data.yaw;
    }
    for (const id of peers.keys()) if (!seen.has(id)) removePeer(id);
  }
  function tick(now) {
    frame = requestAnimationFrame(tick);
    const dt = Math.min(.05, (now - lastFrame) / 1000 || .016); lastFrame = now;
    for (const peer of peers.values()) {
      peer.group.position.lerp(peer.target, Math.min(1, dt * 4));
      peer.group.rotation.y += Math.atan2(Math.sin(peer.yaw - peer.group.rotation.y), Math.cos(peer.yaw - peer.group.rotation.y)) * Math.min(1, dt * 5);
      peer.group.visible = Math.hypot(peer.group.position.x - player.pos.x,
        peer.group.position.z - player.pos.z) > .8;
      peer.model?.mixer.update(dt);
    }
  }
  function schedule(ms) { clearTimeout(timer); timer = setTimeout(sync, ms); }
  function sync() {
    clearTimeout(timer);
    if (!enabled || disposed || !room || document.hidden) return;
    const ownGeneration = generation, ownRoom = room;
    const pilot = pilotSnapshot(storage);
    const body = { id: secret, room, ...pilot, x: player.pos.x, z: player.pos.z, yaw: player.yaw };
    queued(body).then(result => {
      if (disposed || !enabled || generation !== ownGeneration || room !== ownRoom) return;
      applyRoster(Array.isArray(result.peers) ? result.peers : []);
      state('connected', Number(result.online) || 0);
      schedule(UPDATE_MS);
    }).catch(() => {
      if (disposed || !enabled || generation !== ownGeneration) return;
      clearPeers(); state('unavailable'); schedule(12000);
    });
  }
  function leave() { queued({ id: secret, leave: true }).catch(() => {}); }
  function setScene(wrapper) {
    originalSetScene(wrapper);
    const nextRoom = roomForScene(wrapper);
    if (nextRoom === room && wrapper.scene === scene) return;
    const hadRoom = room;
    room = nextRoom; scene = wrapper.scene; generation++;
    clearTimeout(timer); clearPeers();
    if (!enabled) return;
    if (hadRoom && !room) leave();
    if (room && !document.hidden) { state('connecting'); queueMicrotask(sync); }
    else state('waiting');
  }
  engine.setScene = setScene;
  scene = engine.composer.passes[0]?.scene || null;
  room = roomForScene({ scene });
  function onVisibility() {
    if (!enabled) return;
    generation++; clearTimeout(timer); clearPeers();
    if (document.hidden) { leave(); state('waiting'); }
    else if (room) { state('connecting'); sync(); }
  }
  document.addEventListener('visibilitychange', onVisibility);
  return {
    setEnabled(value) {
      if (disposed || enabled === !!value) return;
      enabled = !!value; generation++; clearTimeout(timer); clearPeers();
      if (enabled) {
        frame = requestAnimationFrame(tick); lastFrame = performance.now();
        state(room && !document.hidden ? 'connecting' : 'waiting');
        if (room && !document.hidden) sync();
      } else {
        cancelAnimationFrame(frame); frame = 0;
        leave(); state('off');
      }
    },
    dispose() {
      disposed = true; generation++; clearTimeout(timer); cancelAnimationFrame(frame);
      if (enabled) leave(); clearPeers();
      document.removeEventListener('visibilitychange', onVisibility);
      if (engine.setScene === setScene) engine.setScene = originalSetScene;
    },
  };
}
