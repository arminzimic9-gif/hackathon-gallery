// Hackathon Station: intro -> pilot -> hangar -> board -> takeoff -> hyperspace flight -> dock -> Grand Gallery <-> Command Bridge.
import * as THREE from 'three';
import { createEngine } from './engine.js';
import { createUI } from './ui.js';
import { createPlayer } from './player.js';
import { createSpace } from './space.js';
import { createHangar, createGallery, createBridge, createCeremony } from './rooms.js';
import { randomPilot } from './pilot.js';
import { placeholderArt } from './art.js';
import { createWeapons } from './weapons.js';
import { VISORS } from './pilot.js';

export async function mountStation(root, { assetUrl, art = null, winners = [], storage = null, onEvent = () => {} } = {}) {
  const store = {
    get(k, d) { try { const v = storage?.getItem('hs.' + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
    set(k, v) { try { storage?.setItem('hs.' + k, JSON.stringify(v)); } catch { /* storage unavailable */ } },
  };
  const engine = createEngine(root, assetUrl);
  const ui = createUI(root, { assetUrl });
  const joy = document.createElement('div'); joy.className = 'st-joy'; joy.innerHTML = '<i></i>'; joy.style.display = 'none'; root.appendChild(joy);
  const player = createPlayer(engine.camera, engine.renderer.domElement, joy);
  const collection = (art && art.length) ? art : placeholderArt(24);

  const [flightGltf, hangarMeta, galleryMeta, bridgeMeta, ceremonyMeta] = await Promise.all([
    engine.load('flight.glb'),
    fetch(assetUrl('hangar_meta.json')).then((r) => r.json()),
    fetch(assetUrl('gallery_meta.json')).then((r) => r.json()),
    fetch(assetUrl('bridge_meta.json')).then((r) => r.json()),
    fetch(assetUrl('ceremony_meta.json')).then((r) => r.json()),
  ]);

  let pilot = store.get('pilot', null);
  let xp = store.get('xp', 0);
  const objectives = [
    { id: 'drones', text: 'Hit 3 training drones · 0/3', done: false },
    { id: 'board', text: 'Board your fighter', done: false },
    { id: 'reach', text: 'Reach Hackathon Station', done: false },
    { id: 'view', text: 'View 5 artworks · 0/5', done: false },
    { id: 'bridge', text: 'Visit the Command Bridge', done: false },
    { id: 'ceremony', text: 'Watch the closing ceremony', done: false },
  ];
  const done = (id, text) => { const o = objectives.find((x) => x.id === id); if (!o || o.done) return; o.done = true; if (text) o.text = text; ui.setObjectives(objectives); ui.toast('Objective complete'); gain(80); };
  const gain = (n) => { xp += n; store.set('xp', xp); ui.setXp(xp); ui.toast('+' + n + ' XP'); };
  const showJoy = (v) => { joy.style.display = v && root.classList.contains('touch') ? 'block' : 'none'; };
  const resetCam = () => { engine.camera.fov = 62; engine.camera.updateProjectionMatrix(); };
  let weapons = null, drones = 0, holsterToast = false;
  const ensureWeapons = () => { weapons = weapons || createWeapons(engine, { color: VISORS[pilot.visor], onDroneDown: () => { drones++; gain(25); ui.toast('Drone down'); const o = objectives.find((x) => x.id === 'drones'); if (o && !o.done) { o.text = `Hit 3 training drones · ${Math.min(drones, 3)}/3`; ui.setObjectives(objectives); if (drones >= 3) done('drones'); } } }); return weapons; };
  // run a walkable room with the blaster attached (or holstered)
  function runRoom(room, { armed = false, droneSpots = [] } = {}) {
    const w = ensureWeapons();
    w.attach(room.scene, { armed, droneSpots });
    if (!armed && !holsterToast) { holsterToast = true; setTimeout(() => ui.toast('Weapons holstered here'), 1200); }
    engine.setScene({ ...room, update: (dt, t) => { room.update(dt, t, player); w.update(dt, t); } });
  }
  const touchHooks = () => ({ onFire: () => weapons?.fire(), onJump: () => player.jump() });

  // ------------------------------------------------------------ 1. intro flyby
  let space = createSpace(engine, flightGltf, pilot || randomPilot());
  engine.setScene(space);

  // ------------------------------------------------------------ 2. pilot creator (space keeps drifting behind)
  function createPilot() {
    ui.creator(pilot, async (p) => {
      pilot = p; store.set('pilot', p); onEvent('pilot', p);
      await ui.fadeOut(false, 700);
      await enterHangar();
      ui.fadeIn(900);
    }, { xp });
  }

  // ------------------------------------------------------------ 3. hangar: walk to your own fighter and board
  async function enterHangar() {
    const hangar = await createHangar(engine, hangarMeta, flightGltf, pilot, collection, {
      prompt: (t, label, fn) => ui.prompt(t, label, fn),
      onBoard: () => { player.setEnabled(false); showJoy(false); ui.prompt(null); weapons?.attach(hangar.scene, { armed: false }); done('board'); ui.setHint('Launching…'); },
      onLaunched: () => launch(),
    });
    resetCam();
    const T = (x, y, z) => new engine.THREE.Vector3(x, y, z);
    runRoom(hangar, { armed: true, droneSpots: [T(-7, 5, -20), T(7, 6, -22), T(0, 7.5, -27), T(-11, 4.5, -12), T(11, 5, -14)] });
    hangar.enter(player);
    ui.exploreHud(pilot, { objectives, xp, where: 'Departure Hangar', hint: 'WASD move · drag look · Space jump · click / F fire · E interact', ...touchHooks(), armed: true });
    player.setEnabled(true); showJoy(true);
  }

  // ------------------------------------------------------------ 4. hyperspace + 20 s flight + docking
  async function launch() {
    await ui.fadeOut(true, 350);
    space.dispose();
    space = createSpace(engine, flightGltf, pilot, {
      onHud: (s) => fhud.set(s),
      onMsg: (m) => fhud.msg(m),
      onHit: () => fhud.hit(),
      onFlash: async () => { await ui.fadeOut(true, 120); ui.fadeIn(500); },
      onCrystal: () => {},
      onRockDown: (e) => fhud.pop(e),
      onDocked: ({ score }) => docked(score),
    });
    const fhud = ui.flightHud((v) => space.setBoost(v), () => space.fire());
    resetCam();
    engine.setScene(space);
    space.startFlight();
    fhud.msg('HYPERSPACE');
    ui.fadeIn(500);
  }

  async function docked(score) {
    const best = store.get('best', 0);
    if (score > best) store.set('best', score);
    onEvent('flight', { score, pilot });
    await ui.fadeOut(true, 700);
    await enterGallery('dock');
    done('reach');
    gain(Math.round(score / 10));
    ui.toast(`Docked · score ${score}${score > best ? ' · new best' : ''}`);
    ui.fadeIn(1000);
  }

  // ------------------------------------------------------------ 5. Grand Gallery and 6. Command Bridge
  let gallery = null, bridge = null;
  async function enterGallery(from) {
    gallery = gallery || await createGallery(engine, galleryMeta, collection, {
      prompt: (t, label, fn) => ui.prompt(t, label, fn),
      onView: (it) => ui.focusCard(it.sample ? 'Sample piece' : 'Artwork', it.title, [it.author, it.caption].filter(Boolean).join(' · ')),
      onNewView: (n) => { const o = objectives.find((x) => x.id === 'view'); if (!o.done) { o.text = `View 5 artworks · ${Math.min(n, 5)}/5`; ui.setObjectives(objectives); } gain(40); if (n >= 5) done('view', 'View 5 artworks · 5/5'); },
      onLift: () => toBridge(),
    });
    resetCam();
    runRoom(gallery, { armed: false });
    gallery.enter(player, from);
    ui.exploreHud(pilot, { objectives, xp, where: 'The Grand Gallery', hint: 'Look at an artwork and press E · Space jump · lift at the far end', ...touchHooks() });
    player.setEnabled(true); showJoy(true);
  }
  async function toBridge() {
    player.setEnabled(false);
    await ui.fadeOut(false, 600);
    bridge = bridge || await createBridge(engine, bridgeMeta, winners, { prompt: (t, l, fn) => ui.prompt(t, l, fn), onLift: () => toGallery(), onCeremony: () => toCeremony() });
    resetCam();
    runRoom(bridge, { armed: false });
    bridge.enter(player);
    ui.exploreHud(pilot, { objectives, xp, where: 'Command Bridge', hint: 'Walk to the holo-table for the Ceremony Hall', ...touchHooks() });
    player.setEnabled(true); showJoy(true);
    done('bridge');
    ui.fadeIn(800);
  }
  let ceremony = null;
  async function toCeremony() {
    player.setEnabled(false);
    await ui.fadeOut(false, 700);
    ceremony = ceremony || await createCeremony(engine, ceremonyMeta, winners, {
      prompt: (t, l, fn) => ui.prompt(t, l, fn),
      onLift: () => toBridge(),
      onShow: () => { ui.toast('Ceremony starting'); },
      onReveal: (k) => { if (k === 1) done('ceremony'); },
    });
    resetCam();
    runRoom(ceremony, { armed: false });
    ceremony.enter(player);
    ui.exploreHud(pilot, { objectives, xp, where: 'Ceremony Hall', hint: 'Walk to the stage and start the ceremony', ...touchHooks() });
    player.setEnabled(true); showJoy(true);
    ui.fadeIn(900);
  }
  async function toGallery() {
    player.setEnabled(false);
    await ui.fadeOut(false, 600);
    await enterGallery('bridge');
    ui.fadeIn(800);
  }


  const jump = new URLSearchParams(location.search).get('jump');   // dev shortcut: ?jump=hangar|gallery|bridge
  if (jump) {
    pilot = pilot || randomPilot();
    if (jump === 'hangar') enterHangar();
    else if (jump === 'flight') launch();
    else if (jump === 'gallery') enterGallery('dock');
    else if (jump === 'bridge') toBridge().then(() => {});
    else if (jump === 'ceremony') toCeremony();
  } else ui.intro(() => createPilot());

  return { engine, player, dispose() { engine.dispose(); player.dispose(); space.dispose(); root.innerHTML = ''; } };
}
