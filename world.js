import * as THREE from 'three'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js'
import { Reflector } from 'three/addons/objects/Reflector.js'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'
import SEED_ART from './seed.json'
import { createLiveUniforms, patchLiving, waterShader, createSky, beamMaterial, portalMaterial, FLOOR_REFLECTION, RIPPLES } from './fx.js'
import { posterCanvas, textTexture, dominantColor, clamp, openWallCanvas, radialGlow } from './art.js'
import { buildHub, HUB_RADIUS } from './hub.js'
import { buildTunnel, TUNNEL_ORIGIN } from './tunnel.js'
import { buildPanorama, PANORAMA_ORIGIN } from './panorama.js'
import { buildCubes, CUBES_ORIGIN } from './cubes.js'
import { buildRoom, ROOM_DEFS } from './rooms.js'
import { buildCeremony } from './ceremony.js'
import { buildArcade, GAMES } from './arcade.js'
import { buildLift, buildStairs, FLOORS } from './lift.js'
import { STYLES, buildStyleTextures, ROLE_MAP, LOOK, buildStyleProps } from './styles.js'
export { STYLES }
import { createHandsIntro } from './intro-hands.js'

export const ACCENT = '#d8ff69'
export const ZONES = [
  { id: 'hub', name: 'The Rotunda', hue: '#9fd7ff' },
  { id: 'tunnel', name: 'Infinity Tunnel', hue: '#80dcf0' },
  ...ROOM_DEFS.map(({ id, name, hue }) => ({ id, name, hue })),
  { id: 'panorama', name: 'Panorama Room', hue: '#b8cfff' },
  { id: 'cubes', name: 'Cube Room', hue: '#ff875c' },
  { id: 'ceremony', name: 'Rooftop Stage', hue: '#ffc95c' },
  { id: 'arcade', name: 'Underground Arcade', hue: '#ff4fd8' },
]
export { FLOORS, GAMES }
export const floorOf = (zoneId) => zoneId === 'arcade' ? -1 : zoneId === 'ceremony' ? 1 : 0
export { SEED_ART }
const ROOM_IDS = ROOM_DEFS.map((r) => r.id)
const SLOTS = 14 // 8 arched niches + 6 piers per room
const ORIGINS = { memes: new THREE.Vector3(90, 0, 0), art: new THREE.Vector3(180, 0, 0), apps: new THREE.Vector3(270, 0, 0), agents: new THREE.Vector3(360, 0, 0), tunnel: TUNNEL_ORIGIN, panorama: PANORAMA_ORIGIN, cubes: CUBES_ORIGIN, ceremony: new THREE.Vector3(-90, 0, 0), arcade: new THREE.Vector3(-200, 0, 0) }
const FOG = { hub: ['#060b12', .016], room: ['#0b0d10', .018], tunnel: ['#02060a', .006], panorama: ['#010204', .002], cubes: ['#030306', .004], roof: ['#060b12', .007], arcade: ['#07040b', .02] }
// Lift and stair placements per floor zone, in zone-local coordinates.
const LIFTS = { hub: { x: 0, z: 10.25, rot: Math.PI }, arcade: { x: 0, z: -.25, rot: Math.PI }, ceremony: { x: 0, z: 1.75, rot: Math.PI } }
const STAIRS = {
  hub: [{ x: 4.75, z: 8.2, rot: -2.618, dir: 'up', to: 'ceremony', label: 'ROOFTOP' }, { x: -4.75, z: 8.2, rot: 2.618, dir: 'down', to: 'arcade', label: 'ARCADE' }],
  arcade: [{ x: 9.6, z: -2.4, rot: Math.PI, dir: 'up', to: 'hub', label: 'GALLERY' }],
  ceremony: [{ x: -9.6, z: -.4, rot: Math.PI, dir: 'down', to: 'hub', label: 'GALLERY' }],
}
const quartOut = (t) => 1 - Math.pow(1 - t, 4)
const expoOut = (t) => t >= 1 ? 1 : 1 - Math.pow(2, -10 * t)
const EGGS = [
  ['memes', -1, .55, 9.6, 'SHIP IT'], ['memes', 1, .62, -4.3, '404'],
  ['art', 1, .58, 4.2, 'LGTM'], ['apps', -1, .6, -9.6, 'AGAIN?'], ['agents', 1, .56, .95, 'NO BUGS'],
]

// Moonlit glass: a night-sky gradient, a soft moon glow and leaded panes.
function windowTexture() {
  const c = document.createElement('canvas'); c.width = 128; c.height = 256
  const g = c.getContext('2d'), grad = g.createLinearGradient(0, 0, 0, 256)
  // Golden-hour glass: violet dusk above, amber glow low where the warm rays start.
  grad.addColorStop(0, '#2a2142'); grad.addColorStop(.45, '#8a4a54'); grad.addColorStop(.8, '#e8955a'); grad.addColorStop(1, '#ffd796')
  g.fillStyle = grad; g.fillRect(0, 0, 128, 256)
  const glow = g.createRadialGradient(64, 210, 2, 64, 210, 120); glow.addColorStop(0, 'rgba(255,236,190,.9)'); glow.addColorStop(1, 'rgba(255,220,170,0)')
  g.fillStyle = glow; g.fillRect(0, 0, 128, 256)
  for (let i = 0; i < 26; i++) { g.fillStyle = 'rgba(255,255,255,' + (.3 + Math.random() * .6) + ')'; g.fillRect(Math.random() * 128, Math.random() * 150, 1.4, 1.4) }
  g.strokeStyle = 'rgba(6,10,14,.85)'; g.lineWidth = 3
  for (let y = 32; y < 256; y += 32) { g.beginPath(); g.moveTo(0, y); g.lineTo(128, y); g.stroke() }
  for (const x of [43, 85]) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 256); g.stroke() }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t
}

export function createGalleryWorld(mount, callbacks = {}) {
  const scene = new THREE.Scene()
  scene.background = new THREE.Color('#05090d')
  scene.fog = new THREE.FogExp2('#060b12', .016)
  const camera = new THREE.PerspectiveCamera(62, 1, .07, 120)
  camera.rotation.order = 'YXZ'
  const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' })
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.3
  renderer.domElement.className = 'hg-canvas'
  renderer.info.autoReset = false
  mount.appendChild(renderer.domElement)
  const pmrem = new THREE.PMREMGenerator(renderer)
  const envTarget = pmrem.fromScene(new RoomEnvironment(), .04)
  scene.environment = envTarget.texture; scene.environmentIntensity = .28
  pmrem.dispose()

  const quality = { mode: 'auto', level: 1, fps: 60 }
  let styleId = 'cinematic'
  const styleTex = buildStyleTextures()
  const qualityScale = [0.62, 0.84, 1]
  // Auto mode also scales resolution continuously (dynScale) before shedding a level.
  let dynScale = 1, steady = 0, zoneClock = 0
  const stats = { calls: 0, tris: 0 }
  let composer = null, renderPass = null, width = 1, height = 1, disposed = false
  const live = createLiveUniforms()

  const mat = (color, metalness = .05, roughness = .8, side = THREE.FrontSide) => new THREE.MeshStandardMaterial({ color, metalness, roughness, side })
  const C = new THREE.Color(ACCENT)
  const mats = {
    stone: patchLiving(mat('#30393d', 0, .78), live, { ink: true, bleed: .1 }),
    stoneBack: patchLiving(mat('#12181c', 0, .9, THREE.DoubleSide), live, { bleed: 0 }),
    wallBack: patchLiving(mat('#1c252a', 0, .85, THREE.DoubleSide), live, { ink: true, bleed: .12 }),
    wall: patchLiving(mat('#242d31', 0, .88), live, { ink: true, bleed: .14 }),
    arch: patchLiving(mat('#333d40', 0, .74), live, { ink: true, bleed: .1 }),
    vault: patchLiving(mat('#1b2226', 0, .9, THREE.DoubleSide), live, { ink: true, bleed: .08 }),
    ceiling: patchLiving(mat('#11171a', 0, .9), live, { bleed: 0 }),
    floor: patchLiving(mat('#0e1416', .12, .5), live, { ripples: true, bleed: .55 }),
    // The rooftop deck is rain-wet: dark, glossy, catching the screen and skyline.
    roofFloor: patchLiving(mat('#080c10', .35, .16), live, { ripples: true, bleed: .3 }),
    trim: patchLiving(mat('#45524f', .45, .42), live, { bleed: 0 }),
    stage: patchLiving(mat('#2a3635', .35, .3), live, { bleed: 0 }), podium: patchLiving(mat('#34423e', .4, .3), live, { bleed: 0 }),
    neon: new THREE.MeshBasicMaterial({ color: C.clone().multiplyScalar(1.7), toneMapped: false }),
    frameEdge: new THREE.MeshBasicMaterial({ color: C.clone().multiplyScalar(.82), toneMapped: false }),
    window: new THREE.MeshBasicMaterial({ map: windowTexture(), color: new THREE.Color(1.15, 1.08, 1), toneMapped: false, side: THREE.DoubleSide }),
    mullion: patchLiving(mat('#151b1f', .2, .6), live, { bleed: 0 }),
  }
  const shared = new Set(Object.values(mats))
  const hemisphere = new THREE.HemisphereLight(0xc6dcff, 0x1b1d22, .8); scene.add(hemisphere)
  const ambient = new THREE.AmbientLight(0x708988, .3); scene.add(ambient)
  const globals = { hemisphere, ambient, base: { ambient: .3, hemisphere: .8 } }
  const sky = createSky(); scene.add(sky)
  // A soft light carried just ahead of the visitor takes on the bleed colour,
  // so nearby art visibly spills its hue onto floor, arches and walls.
  const bleedLight = new THREE.PointLight(0xffffff, 0, 10, 1.35); scene.add(bleedLight)

  function box(x, y, z, w, h, d, material, parent = scene) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material)
    mesh.position.set(x, y, z); parent.add(mesh); return mesh
  }
  const ctxBase = { box, mats, live, portalMaterial, get quality() { return quality.level } }

  // ---- Art data: one record per piece, independent of where it is displayed.
  const artData = new Map()
  let art = [], loadMedia = null
  function dataFor(item) {
    let d = artData.get(item.id)
    if (!d) { d = { item, canvas: posterCanvas(item), image: null, requested: false, thumb: null, version: 0 }; d.color = dominantColor(d.canvas); artData.set(item.id, d) }
    d.item = item
    return d
  }
  const sourceFor = (item) => { const d = item && artData.get(item.id); return d?.image || d?.canvas }
  function ensureLoaded(item) {
    const d = item && dataFor(item)
    if (!d || item.placeholder || d.requested || !loadMedia) return
    d.requested = true
    loadMedia(item.id).then((url) => {
      if (!url || disposed) return
      const img = new Image()
      img.onload = () => {
        if (disposed) return
        d.image = img; d.animated = url.startsWith('data:image/gif'); d.color = dominantColor(img); d.thumb = null; d.version++
        groupsFor(item.id).forEach((g) => applyImage(g, d))
        zones.get('tunnel')?.setArt(art, sourceFor)
        zones.get('panorama')?.setArt(art, sourceFor)
        zones.get('cubes')?.setArt(art, sourceFor)
        ceremony?.director.redrawIf(item.id)
        callbacks.onMedia?.(item.id)
      }
      img.src = url
    }).catch(() => { d.failed = true })
  }
  function thumbFor(id) {
    const d = artData.get(id); if (!d) return null
    if (!d.thumb) {
      const src = d.image || d.canvas, iw = src.naturalWidth || src.width, ih = src.naturalHeight || src.height
      const s = Math.min(1, 520 / Math.max(iw, ih)), c = document.createElement('canvas')
      c.width = Math.round(iw * s); c.height = Math.round(ih * s); c.getContext('2d').drawImage(src, 0, 0, c.width, c.height)
      d.thumb = c.toDataURL('image/jpeg', .84)
    }
    return d.thumb
  }

  // ---- Zones (built lazily on first visit; only the current zone renders).
  const zones = new Map(), pickables = [], eggMeshes = []
  let ceremony = null, current = null
  function placementFor(items) {
    const counts = Object.fromEntries(ROOM_IDS.map((id) => [id, 0])), map = new Map(), order = ['art', 'memes', 'apps', 'agents']
    let rr = 0
    for (const item of items) {
      let room = ROOM_IDS.includes(item.room) && counts[item.room] < SLOTS ? item.room : null
      for (let k = 0; !room && k < 4; k++) { const r = order[(rr + k) % 4]; if (counts[r] < SLOTS) { room = r; rr = (rr + k + 1) % 4 } }
      if (!room) continue
      map.set(item.id, { room, index: counts[room]++ })
    }
    return map
  }
  let placement = new Map()
  function ensureZone(id) {
    if (zones.has(id)) return zones.get(id)
    let zone
    if (id === 'hub') zone = buildHub({ ...ctxBase })
    else if (id === 'tunnel') zone = buildTunnel({ ...ctxBase })
    else if (id === 'panorama') zone = buildPanorama({ ...ctxBase, onStart: () => callbacks.onPanorama?.(true) })
    else if (id === 'cubes') zone = buildCubes({ ...ctxBase })
    else if (id === 'ceremony') {
      ceremony = buildCeremony({ ...ctxBase, origin: ORIGINS.ceremony, globals, callbacks, getArt: () => art, sourceFor, ensureLoaded })
      zone = ceremony.zone
    } else if (id === 'arcade') {
      zone = buildArcade({ ...ctxBase, origin: ORIGINS.arcade })
    } else {
      zone = buildRoom({ ...ctxBase }, ROOM_DEFS.find((r) => r.id === id), ORIGINS[id])
      zone.artGroups = new Map()
    }
    zone.floor = floorOf(id)
    const o = zone.origin || new THREE.Vector3()
    if (LIFTS[id]) {
      const L = LIFTS[id], lift = buildLift(ctxBase, { floor: zone.floor })
      lift.group.position.set(L.x, 0, L.z); lift.group.rotation.y = L.rot; zone.group.add(lift.group)
      if (id !== 'hub') lift.group.position.add(new THREE.Vector3(0, 0, 0))
      zone.lift = lift; lift.pickables.forEach((m) => pickables.push(m))
      zone.liftFront = { x: o.x + L.x, z: o.z + L.z - 3.4 }
    }
    zone.stairs = (STAIRS[id] || []).map((st) => {
      const built = buildStairs(ctxBase, st)
      built.group.position.set(st.x, id === 'hub' ? .02 : 0, st.z); built.group.rotation.y = st.rot; zone.group.add(built.group)
      return { ...st, wx: o.x + st.x, wz: o.z + st.z }
    })
    zone.group.visible = false
    scene.add(zone.group)
    // Art, memes and reflections are positioned in world space, so each zone
    // keeps a world-space layer that shows and hides with it.
    zone.artRoot = new THREE.Group(); zone.artRoot.visible = false; scene.add(zone.artRoot)
    if (zone.kind === 'room') buildEggs(zone)
    // Hub orbs are tappable: a Points hit reports which orb was touched.
    if (zone.kind === 'hub' && zone.floaters?.[0]) { zone.floaters[0].userData = { kind: 'orb' }; pickables.push(zone.floaters[0]) }
    ;(zone.portalMeshes || []).forEach((m) => pickables.push(m))
    ;(zone.pickables || []).forEach((m) => pickables.push(m))
    zones.set(id, zone)
    if (zone.kind === 'room') layoutRoomArt(zone)
    if (zone.setArt) zone.setArt(art, sourceFor)
    applyQualityToZone(zone)
    styleZone(zone)
    return zone
  }
  function buildEggs(zone) {
    EGGS.forEach(([room, side, y, z, label], index) => {
      if (room !== zone.id) return
      const m = new THREE.Mesh(new THREE.PlaneGeometry(.58, .32), new THREE.MeshBasicMaterial({ map: textTexture(label, { width: 460, height: 256, size: 92, color: ACCENT, bg: '#111519', accent: ACCENT }), side: THREE.DoubleSide, toneMapped: false }))
      m.position.set(zone.origin.x + side * 6.02, y, zone.origin.z + z); m.rotation.y = side < 0 ? Math.PI / 2 : -Math.PI / 2
      m.userData = { kind: 'egg', id: index + 1, label }
      zone.artRoot.add(m); pickables.push(m); eggMeshes.push(m)
    })
  }

  // ---- Artwork groups in room niches.
  function applyImage(g, d) {
    const t = new THREE.Texture(d.image); t.needsUpdate = true; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4
    g.image.material.map?.dispose(); g.image.material.map = t; g.image.material.needsUpdate = true
    g.animated = d.animated
    g.halo?.material.color.copy(d.color); g.pool?.material.color.copy(d.color)
  }
  function groupsFor(id) { const out = []; zones.forEach((z) => { const g = z.artGroups?.get(id); if (g) out.push(g) }); return out }
  function createArtGroup(zone, item, slot, number) {
    const d = dataFor(item)
    const group = new THREE.Group(), ratio = clamp(item.ratio || .9, .55, 1.6)
    const h = Math.min(slot.maxH || 2.15, (slot.maxW || 2.5) / ratio), w = h * ratio
    group.position.set(slot.x, slot.y, slot.z)
    group.rotation.y = slot.normal > 0 ? Math.PI / 2 : -Math.PI / 2
    box(0, 0, -.04, w + .2, h + .2, .09, mats.trim, group)
    const edge = box(0, 0, .01, w + .07, h + .07, .025, mats.frameEdge, group)
    const tex = new THREE.CanvasTexture(item.open ? openWallCanvas(number, zone.hue, ratio) : d.canvas); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4
    const image = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, color: 0xe6e6e6, toneMapped: false }))
    image.position.z = .03; image.userData = { kind: 'art', id: item.id }; group.add(image)
    if (!item.open) pickables.push(image)
    // Each piece spills its colour: a pool of light on the floor and a halo on its wall.
    const glowMat = (opacity) => new THREE.MeshBasicMaterial({ map: radialGlow(), color: d.color.clone(), transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false })
    const halo = new THREE.Mesh(new THREE.PlaneGeometry(w + 2.4, h + 2.2), glowMat(item.open ? .08 : .3)); halo.position.z = -.07; group.add(halo)
    const pool = new THREE.Mesh(new THREE.PlaneGeometry(w + 2.2, 2.6), glowMat(item.open ? .06 : .42)); pool.rotation.x = -Math.PI / 2; pool.position.set(0, -slot.y + .03, slot.pier ? .9 : 1.5); group.add(pool)
    const plaque = new THREE.Mesh(new THREE.PlaneGeometry(Math.min(w + .4, 2.6), .24), new THREE.MeshBasicMaterial({ map: textTexture(String(number).padStart(2, '0') + '   ' + item.title.toUpperCase(), { width: 1024, height: 96, size: 44, weight: 600, color: '#e9f2e6', tracking: 4 }), transparent: true, toneMapped: false, depthWrite: false }))
    plaque.position.set(0, -h / 2 - .3, .045); group.add(plaque)
    const cone = new THREE.Mesh(new THREE.ConeGeometry(Math.max(1, w * .6), 3.2, 24, 1, true), beamMaterial(.17, '#' + new THREE.Color('#f6eccf').lerp(d.color, .45).getHexString(), 3.2))
    cone.position.set(0, h / 2 + .6, .55); cone.rotation.x = -.14; cone.renderOrder = 2; group.add(cone)
    zone.artRoot.add(group)
    const g = { group, image, edge, item, slot, zone, normal: slot.normal, hover: 0, w, h, halo, pool }
    if (d.image) applyImage(g, d)
    zone.artGroups.set(item.id, g)
  }
  function clearRoomArt(zone) {
    zone.artGroups.forEach((g) => {
      g.group.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material && !shared.has(o.material)) { o.material.map?.dispose(); o.material.dispose() } })
      g.group.removeFromParent()
      const i = pickables.indexOf(g.image); if (i >= 0) pickables.splice(i, 1)
    })
    zone.artGroups.clear()
  }
  function layoutRoomArt(zone) {
    clearRoomArt(zone)
    const used = new Set()
    art.forEach((item, i) => {
      const p = placement.get(item.id)
      if (p && p.room === zone.id) { createArtGroup(zone, item, zone.slots[p.index], i + 1); used.add(p.index) }
    })
    // Every empty slot gets a labelled open-wall placeholder so no wall reads bare.
    zone.slots.forEach((slot, index) => {
      if (used.has(index)) return
      const open = { id: 'open-' + zone.id + '-' + index, title: 'Open wall', ratio: slot.pier ? .72 : .8, placeholder: true, open: true, palette: index }
      createArtGroup(zone, open, slot, index + 1)
    })
    if (zone === current) zone.artGroups.forEach((g) => ensureLoaded(g.item))
  }
  function setArt(items, media) {
    if (media) loadMedia = media
    art = items.slice(0, SLOTS * 4)
    art.forEach(dataFor)
    placement = placementFor(art)
    zones.forEach((z) => { if (z.kind === 'room') layoutRoomArt(z) })
    for (const id of ['tunnel', 'panorama', 'cubes']) zones.get(id)?.setArt(art, sourceFor)
    ceremony?.director.refresh()
  }

  // ---- Water: real reflections on High, a convincing fake below.
  function applyQualityToZone(zone) {
    zone.setQuality?.(quality.level)
    const high = quality.level === 2
    if (zone.kind === 'hub') {
      zone.water?.removeFromParent(); zone.water?.dispose?.(); zone.water?.material?.dispose()
      const geo = new THREE.CircleGeometry(HUB_RADIUS, 96)
      let water
      if (high) {
        const s = renderer.getPixelRatio() * .5
        water = new Reflector(geo, { textureWidth: Math.round(width * s), textureHeight: Math.round(height * s), clipBias: .003, multisample: 0, shader: waterShader(live, true), color: 0x8fa3b0 })
        Object.assign(water.material.uniforms, live, { uMoonDir: water.material.uniforms.uMoonDir })
      } else {
        const sh = waterShader(live, false)
        water = new THREE.Mesh(geo, new THREE.ShaderMaterial({ ...sh, uniforms: { ...sh.uniforms, textureMatrix: { value: new THREE.Matrix4() }, color: { value: new THREE.Color(1, 1, 1) } } }))
      }
      water.rotation.x = -Math.PI / 2; water.position.y = .02
      zone.group.add(water); zone.water = water
    } else if (zone.kind === 'room' || zone.kind === 'hall' || zone.kind === 'roof') {
      if (zone.reflector) { zone.reflector.removeFromParent(); zone.reflector.dispose(); zone.reflector = null }
      if (high) {
        const s = renderer.getPixelRatio() * .5
        const roof = zone.kind === 'roof'
        const r = new Reflector(new THREE.PlaneGeometry(zone.kind === 'room' ? 12.4 : 26, zone.kind === 'room' ? 22 : 20), { textureWidth: Math.round(width * s), textureHeight: Math.round(height * s), color: roof ? 0x5a6266 : 0x2c3433, clipBias: .003, multisample: 0, shader: FLOOR_REFLECTION })
        Object.assign(r.material, { transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })
        r.rotation.x = -Math.PI / 2
        r.position.set(zone.kind === 'room' ? zone.origin.x : ORIGINS.ceremony.x, .004, zone.kind === 'room' ? zone.origin.z : ORIGINS.ceremony.z - 8)
        zone.artRoot.add(r); zone.reflector = r
      }
    }
  }

  // ---- Player state.
  let yaw = 0, pitch = 0, targetYaw = 0, targetPitch = 0, velX = 0, velZ = 0, moving = {}, joystick = { x: 0, y: 0 }
  let time = 0, glide = null, focusId = null, headBob = 0, stepClock = 0, stepPhase = 0, idle = 0
  let transition = null, exitCooldown = 0, rippleIndex = 0
  const foundEggs = new Set(), reactions = []
  const intro = { active: true, t: 0, hands: null, stage: '' }
  const hsl = {}, openTint = new THREE.Color(), bleedTarget = new THREE.Color(), fogBase = new THREE.Color(), fogColor = new THREE.Color(), tmp = new THREE.Vector3()
  const raycaster = new THREE.Raycaster(); raycaster.far = 26; raycaster.params.Points.threshold = .45
  let hovered = null, pointer = null, lastHit = null

  function baseFov() { return camera.aspect < .9 ? 74 : 62 }
  function local() { const o = current?.origin; return o ? { x: camera.position.x - o.x, z: camera.position.z - o.z } : { x: camera.position.x, z: camera.position.z } }
  function enterZone(id, spawn) {
    const zone = ensureZone(id)
    zones.forEach((z) => { z.group.visible = z === zone; z.artRoot.visible = z === zone })
    current = zone
    const s = spawn || (camera.aspect < .9 && zone.portraitSpawn) || zone.spawn
    const o = zone.origin || new THREE.Vector3()
    camera.position.set(o.x + s.x, 1.7, o.z + s.z)
    yaw = targetYaw = s.yaw || 0; pitch = targetPitch = s.pitch || 0; velX = velZ = 0; glide = null
    const fog = FOG[zone.kind] || FOG.room
    fogBase.set(fog[0]); scene.fog.density = fog[1]; fogColor.copy(fogBase)
    sky.visible = zone.kind === 'hub' || zone.kind === 'roof'
    scene.background.set(sky.visible ? '#05090d' : fog[0])
    if (zone.kind === 'arcade') zone.setMemes?.(memeSources())
    if (transition?.kind === 'lift') { zone.lift?.snap(0); setTimeout(() => zone.lift?.open(), 250) }
    live.uBase.value.set(zone.hue || '#2a3b46').multiplyScalar(.6)
    if (zone.kind === 'room') zone.artGroups.forEach((g) => ensureLoaded(g.item))
    if (['tunnel', 'panorama', 'cubes'].includes(zone.kind)) art.forEach(ensureLoaded)
    exitCooldown = .8; zoneClock = 0
    shedEffects(zone)
    callbacks.onZone?.(zone.id, zone.name, zone.hue, zone.floor, { showStarted: zone.started || false })
  }
  // Transitions: a portal fade, a lift ride (doors, floor count, doors) or stairs.
  const TIMING = { fade: [.42, .9], lift: [1.35, 2.2], stairs: [.75, 1.35] }
  function travelTo(id, spawn, then, kind = 'fade') {
    if (transition || (current && current.id === id && !spawn)) { then?.(); return }
    const z = ZONES.find((q) => q.id === id)
    transition = { to: id, spawn, t: 0, switched: false, then, kind, from: current?.floor ?? 0, toFloor: floorOf(id), dir: floorOf(id) - (current?.floor ?? 0) }
    glide = null; focusId = null
    if (kind === 'lift') current?.lift?.close()
    callbacks.onTransition?.(true, z?.hue || ACCENT, z?.name || '', { kind, from: transition.from, to: transition.toFloor })
  }
  function updateTransition(realDt) {
    if (!transition) return
    transition.t += realDt
    const [switchAt, total] = TIMING[transition.kind]
    if (transition.kind === 'stairs' && !transition.switched) {
      // Climb or descend a little before the fade so the stairs feel walked.
      const k = transition.t / switchAt
      camera.position.y = 1.7 + transition.dir * k * .7
      targetPitch = transition.dir * -.18 * k + (transition.dir < 0 ? -.12 * k : 0)
      camera.position.x -= Math.sin(yaw) * realDt * 1.2; camera.position.z -= Math.cos(yaw) * realDt * 1.2
    }
    if (!transition.switched && transition.t >= switchAt) {
      transition.switched = true
      enterZone(transition.to, transition.spawn)
      callbacks.onTransition?.(false)
    }
    if (transition.t >= total) { const done = transition.then; transition = null; done?.() }
  }
  // ---- World styles: one pass restyles every shared material, the lights,
  // sky, water, portals, pixel scale and bloom; props are built per zone lazily.
  function applyStyle(id) {
    if (!LOOK[id]) return
    styleId = id; const look = LOOK[id], styled = id !== 'cinematic'
    for (const [role, m] of Object.entries(mats)) {
      const st = m.userData.style; if (!st) continue
      const r = ROLE_MAP[id]?.[role]
      st.uStyleMix.value = r ? 1 : 0; st.uStyleMap.value = r ? styleTex[id][r[0]] : null; st.uStyleScale.value = r ? r[1] : 1
      if (m.flatShading !== styled) { m.flatShading = styled; m.needsUpdate = true }
      if (m.userData.baseRough === undefined) m.userData.baseRough = m.roughness
      m.roughness = styled ? .95 : m.userData.baseRough
    }
    mats.neon.color.set(look.neon).multiplyScalar(styled ? 1.15 : 1.7)
    mats.frameEdge.color.set(look.edge).multiplyScalar(styled ? 1 : .82)
    globals.base.hemisphere = look.hemi; globals.base.ambient = look.ambient
    renderer.toneMappingExposure = look.exposure
    scene.environmentIntensity = styled ? .12 : .28
    live.uInk.value = styled ? 0 : quality.level === 0 ? .55 : 1
    sky.material.uniforms.uTint.value.set(look.sky); sky.material.uniforms.uDay.value = id === 'retro' ? 1 : 0
    renderer.domElement.style.imageRendering = styled ? 'pixelated' : 'auto'
    coinMat.color.set(id === 'retro' ? '#fcbc3c' : '#ffc928'); coinMat.flatShading = styled; coinMat.metalness = styled ? .1 : .85; coinMat.needsUpdate = true
    zones.forEach(styleZone)
    setQuality(quality.mode)
    if (current) { const fog = FOG[current.kind] || FOG.room; scene.fog.density = fog[1] * look.fogScale }
    callbacks.onStyle?.(id)
  }
  function styleZone(zone) {
    zone.setStyle?.(styleId)
    if (zone.styleOnly) return
    const w = zone.water?.material?.uniforms
    if (w?.uStyle) { w.uStyle.value = styleId === 'retro' ? 2 : styleId === 'voxel' ? 1 : 0; w.uStyleMap.value = styleId === 'cinematic' ? null : styleTex[styleId].water }
    ;[...(zone.portals || []).map((p) => p.panel), ...(zone.portalMeshes || [])].forEach((m) => { if (m.material?.uniforms?.uSteps) m.material.uniforms.uSteps.value = styleId === 'retro' ? 4 : styleId === 'voxel' ? 6 : 0 })
    zone.props = zone.props || {}
    if (styleId !== 'cinematic' && !zone.props[styleId]) {
      const built = buildStyleProps(styleId, zone, styleTex)
      zone.group.add(built.group); built.pickables.forEach((m) => pickables.push(m)); zone.props[styleId] = built
    }
    Object.entries(zone.props).forEach(([k, v]) => { v.group.visible = k === styleId })
  }
  // Block-break debris: one instanced pool of little cubes.
  const DEBRIS = 140, debris = new THREE.InstancedMesh(new THREE.BoxGeometry(.12, .12, .12), new THREE.MeshLambertMaterial({ color: '#ffffff' }), DEBRIS)
  debris.instanceMatrix.setUsage(THREE.DynamicDrawUsage); debris.frustumCulled = false; scene.add(debris)
  const shards = Array.from({ length: DEBRIS }, () => ({ life: 0, p: new THREE.Vector3(), v: new THREE.Vector3(), c: new THREE.Color() }))
  const dm = new THREE.Matrix4(), dq = new THREE.Quaternion(), ds = new THREE.Vector3()
  let shardIndex = 0
  function breakBlock(at, colors) {
    for (let i = 0; i < 16; i++) {
      const s = shards[shardIndex]; shardIndex = (shardIndex + 1) % DEBRIS
      s.life = 1; s.p.copy(at).add(new THREE.Vector3((Math.random() - .5) * .6, (Math.random() - .5) * .6, (Math.random() - .5) * .6))
      s.v.set((Math.random() - .5) * 4, 2 + Math.random() * 3, (Math.random() - .5) * 4); s.c.set(colors[i % colors.length])
    }
  }
  function updateDebris(dt) {
    let any = false
    shards.forEach((s, i) => {
      if (s.life > 0) { any = true; s.life -= dt * .9; s.v.y -= 9.8 * dt; s.p.addScaledVector(s.v, dt); if (s.p.y < .06) { s.p.y = .06; s.v.multiplyScalar(.4) } }
      ds.setScalar(Math.max(0, s.life)); dm.compose(s.p, dq, ds); debris.setMatrixAt(i, dm); debris.setColorAt(i, s.c)
    })
    if (any || debris.userData.any) { debris.instanceMatrix.needsUpdate = true; if (debris.instanceColor) debris.instanceColor.needsUpdate = true }
    debris.userData.any = any
  }
  function hitProp(obj) {
    const props = current?.props?.[styleId]; const it = props?.items.find((x) => x.mesh === obj); if (!it) return
    const at = obj.getWorldPosition(new THREE.Vector3())
    if (obj.userData.type === 'qblock') {
      it.bump = time
      if (!it.used) { it.used = true; setTimeout(() => { obj.material = it.usedMat; setTimeout(() => { obj.material = it.mat; it.used = false }, 6000) }, 160) }
      const coin = new THREE.Sprite(new THREE.SpriteMaterial({ map: styleTex.retro.coin, transparent: true, depthWrite: false }))
      coin.position.copy(at).add(new THREE.Vector3(0, .7, 0)); coin.scale.set(.5, .5, 1); scene.add(coin)
      reactions.push({ sprite: coin, age: 0, dx: 0, dz: 0, texture: styleTex.retro.coin, keep: true })
      callbacks.onPropSound?.('coin')
    } else if (obj.userData.type === 'pipe') { it.bump = time; callbacks.onPropSound?.('pipe') }
    else if (obj.userData.type === 'voxel') {
      if (time - it.broken < 4) return
      it.broken = time; breakBlock(at, ['#7d7d7d', '#5aa83a', '#9c7a48', '#f6d27a']); callbacks.onPropSound?.('break')
    }
  }

  // ---- Arcade games that play in the world (Memory Match is a 2D overlay).
  let game = null, gameClock = 0
  const coinGeo = new THREE.CylinderGeometry(.27, .27, .06, 28)
  const coinMat = new THREE.MeshStandardMaterial({ color: '#ffc928', metalness: .85, roughness: .25, emissive: '#5a3c00', emissiveIntensity: .8 })
  function startCoins(duration = 45) {
    const arcade = ensureZone('arcade'), o = arcade.origin
    const begin = () => {
      endGame(true)
      const coins = []
      for (let i = 0; i < 30; i++) {
        let x, z
        do { x = (Math.random() - .5) * 20; z = -2 - Math.random() * 12 } while (Math.abs(x) < 1.2 && z > -4)
        const m = new THREE.Mesh(coinGeo, coinMat); m.rotation.x = Math.PI / 2; m.position.set(o.x + x, 1, o.z + z)
        m.userData.phase = Math.random() * 6; arcade.artRoot.add(m); coins.push(m)
      }
      game = { kind: 'coins', t: 0, duration, collected: 0, total: coins.length, coins }
      callbacks.onGame?.({ kind: 'coins', left: duration, collected: 0, total: coins.length })
    }
    if (current?.id !== 'arcade') travelTo('arcade', null, begin, 'lift'); else begin()
  }
  function startMemeHunt() {
    const begin = () => { endGame(true); game = { kind: 'memes', t: 0, found: new Set() }; callbacks.onGame?.({ kind: 'memes', elapsed: 0, found: 0, total: 5 }) }
    if (current?.floor !== 0) travelTo('hub', null, begin, 'lift'); else begin()
  }
  function endGame(silent) {
    if (!game) return
    const g = game; game = null
    g.coins?.forEach((c) => c.removeFromParent())
    if (!silent) callbacks.onGameEnd?.(g.kind === 'coins' ? { game: 'coins', score: g.collected, total: g.total } : { game: 'memes', score: Math.round(g.t * 10) / 10, found: g.found.size })
    else callbacks.onGame?.(null)
  }
  function updateGame(realDt, dt) {
    if (!game) return
    game.t += realDt; gameClock += realDt
    if (game.kind === 'coins') {
      game.coins.forEach((c) => {
        if (!c.visible) return
        c.rotation.z += dt * 3.2; c.position.y = 1 + Math.sin(time * 2.4 + c.userData.phase) * .12
        if (Math.hypot(c.position.x - camera.position.x, c.position.z - camera.position.z) < .9) {
          c.visible = false; game.collected++
          emojiBurst('✨', (sp) => sp.position.copy(c.position).add(new THREE.Vector3((Math.random() - .5) * .5, Math.random() * .4, (Math.random() - .5) * .5)), 5)
          callbacks.onCoin?.(game.collected)
        }
      })
      if (gameClock > .1) { gameClock = 0; callbacks.onGame?.({ kind: 'coins', left: Math.max(0, game.duration - game.t), collected: game.collected, total: game.total }) }
      if (game.t >= game.duration || game.collected >= game.total) endGame()
    } else if (game.kind === 'memes') {
      if (gameClock > .1) { gameClock = 0; callbacks.onGame?.({ kind: 'memes', elapsed: game.t, found: game.found.size, total: 5 }) }
    }
  }
  function memeSources() {
    const memes = art.filter((a) => placement.get(a.id)?.room === 'memes')
    return (memes.length ? memes : art).map((a) => sourceFor(a)).filter(Boolean)
  }
  // Ride the lift to a floor: walk up to the doors, they close, the cabin
  // counts floors, and the doors open on arrival.
  function ride(floor) {
    const target = FLOORS.find((f) => f.floor === floor)
    if (!target || transition || (current?.floor === floor && current?.kind !== 'room')) return
    const go = () => travelTo(target.zone, null, null, 'lift')
    current?.lift?.press(floor, time)
    callbacks.onLiftPress?.(floor)
    if (current?.liftFront) glideTo(current.liftFront.x, current.liftFront.z, Math.PI, null, go)
    else go()
  }

  // ---- Interaction.
  function setLook(dx, dy) {
    if (intro.active || glide) return
    targetYaw -= dx * .0028
    targetPitch = clamp(targetPitch - dy * .0023, -.95, .95)
  }
  function glideTo(x, z, lookYaw, id, onDone, lookPitch = 0) {
    const shortYaw = targetYaw + Math.atan2(Math.sin(lookYaw - targetYaw), Math.cos(lookYaw - targetYaw))
    glide = { fromX: camera.position.x, fromZ: camera.position.z, x, z, fromYaw: targetYaw, yaw: shortYaw, t: 0, duration: 1.45, id, onDone }
    targetPitch = lookPitch; focusId = id || null
  }
  function findGroup(id) { for (const z of zones.values()) { const g = z.artGroups?.get(id); if (g) return g } return null }
  function focusById(id) {
    const target = current?.focusTarget?.(id)
    if (target) {
      const outward = new THREE.Vector2(camera.position.x - target.x, camera.position.z - target.z).normalize()
      const x = target.x + outward.x * 2.65, z = target.z + outward.y * 2.65
      const dx = target.x - x, dz = target.z - z
      glideTo(x, z, Math.atan2(-dx, -dz), id, undefined, Math.atan2(target.y - 1.7, Math.hypot(dx, dz)))
      return
    }
    const p = placement.get(id); if (!p) return
    const go = () => {
      const g = current.artGroups.get(id); if (!g) return
      const halfV = THREE.MathUtils.degToRad((baseFov() - 14) / 2), wide = camera.aspect > 1.15
      const usable = camera.aspect * (wide ? .62 : 1)
      // Portrait keeps the piece in the top half, above the coverflow sheet.
      const portrait = camera.aspect < .9
      const distance = clamp(Math.max((g.h + .5) * (portrait ? 2.5 : 1.45) / 2 / Math.tan(halfV), g.w * 1.3 / 2 / (Math.tan(halfV) * usable)), 2.6, 9)
      const yawToArt = g.normal > 0 ? Math.PI / 2 : -Math.PI / 2
      const shift = wide ? Math.tan(halfV) * camera.aspect * distance * .3 : 0
      const x = g.group.position.x + g.normal * distance + Math.cos(yawToArt) * shift
      const z = g.group.position.z - Math.sin(yawToArt) * shift
      const drop = Math.tan(halfV) * distance * (portrait ? .3 : .16)
      glideTo(x, z, yawToArt, id, undefined, Math.atan((g.group.position.y - .15 - drop - 1.7) / distance))
    }
    if (current?.id !== p.room) travelTo(p.room, null, go)
    else go()
  }
  function raycast(clientX, clientY) {
    const rect = renderer.domElement.getBoundingClientRect()
    raycaster.setFromCamera(new THREE.Vector2((clientX - rect.left) / rect.width * 2 - 1, -(clientY - rect.top) / rect.height * 2 + 1), camera)
    const hit = raycaster.intersectObjects(pickables.filter((m) => m.parent && isVisible(m)), false)[0]
    lastHit = hit
    return hit?.object || null
  }
  function isVisible(o) { for (let p = o; p; p = p.parent) if (!p.visible) return false; return true }
  function pick(clientX, clientY) {
    if (intro.active || transition) return false
    const obj = raycast(clientX, clientY); if (!obj) return false
    const hit = obj.userData
    if (hit.kind === 'egg') {
      obj.userData.popAt = time
      emojiBurst('✨', (s) => s.position.copy(obj.getWorldPosition(tmp)).add(new THREE.Vector3((Math.random() - .5) * .6, Math.random() * .5, (Math.random() - .5) * .6)), 9)
      if (!foundEggs.has(hit.id)) { foundEggs.add(hit.id); callbacks.onEgg?.(hit.id, foundEggs.size, hit.label) }
      if (game?.kind === 'memes' && !game.found.has(hit.id)) { game.found.add(hit.id); callbacks.onHuntFind?.(hit.label, game.found.size); if (game.found.size >= 5) endGame() }
      return true
    }
    if (hit.kind === 'art') { focusById(hit.id); return true }
    if (hit.kind === 'portal') { callbacks.onPortalTap?.(hit.id); goThroughPortal(hit.id); return true }
    if (hit.kind === 'prop') { hitProp(obj); return true }
    if (hit.kind === 'orb') {
      const at = lastHit?.point?.clone() || obj.position.clone()
      emojiBurst('✨', (sp) => sp.position.copy(at).add(new THREE.Vector3((Math.random() - .5) * .7, (Math.random() - .5) * .5, (Math.random() - .5) * .7)), 8)
      addRipple(at.x, at.z, 1); callbacks.onPropSound?.('egg'); return true
    }
    if (hit.kind === 'lift') { if (!hit.here) ride(hit.floor); else current.lift?.press(hit.floor, time); return true }
    if (hit.kind === 'cabinet') { const cab = current.cabinets?.find((c) => c.game.id === hit.id); if (cab) cab.press = time; callbacks.onCabinet?.(hit.id); return true }
    return false
  }
  function goThroughPortal(id) {
    if (id === 'hub') travelTo('hub', ensureZone('hub').spawnFrom(current?.id))
    else if (current?.id === 'hub' && ROOM_IDS.includes(id)) { ensureZone('tunnel').setDestination(id); travelTo('tunnel') }
    else travelTo(id)
  }
  function hover(clientX, clientY) { pointer = clientX == null ? null : { x: clientX, y: clientY } }
  function updateHover(dt) {
    let obj = null
    if (pointer && !intro.active && !transition && !glide && frames % 3 === 0) obj = raycast(pointer.x, pointer.y)
    else if (pointer && frames % 3 !== 0) obj = hovered
    if (obj !== hovered) {
      hovered = obj
      callbacks.onHover?.(obj ? obj.userData.kind : null)
      if (obj) callbacks.onHoverSound?.(obj.userData.kind)
    }
    const hp = hovered?.userData
    current?.portals?.forEach((p) => { p.hover = hp?.kind === 'portal' && hp.id === p.id ? 1 : 0 })
    current?.cabinets?.forEach((c) => { c.hover = hp?.kind === 'cabinet' && hp.id === c.game.id ? 1 : 0 })
    if (current?.portalMeshes && !current.portals) current.portalMeshes.forEach((m) => { const u = m.material.uniforms?.uHover; if (u) u.value += ((hovered === m ? 1 : 0) - u.value) * (1 - Math.exp(-6 * dt)) })
    current?.artGroups?.forEach((g) => {
      const target = hp?.kind === 'art' && hp.id === g.item.id ? 1 : 0
      g.hover += (target - g.hover) * (1 - Math.exp(-8 * dt))
      g.group.scale.setScalar(1 + g.hover * .035)
      g.edge.material = g.hover > .5 ? mats.neon : mats.frameEdge
    })
  }
  function emojiBurst(emoji, place, count = 7) {
    const canvas = document.createElement('canvas'); canvas.width = 128; canvas.height = 128
    const c = canvas.getContext('2d'); c.font = '88px serif'; c.textAlign = 'center'; c.fillText(emoji, 64, 94)
    const t = new THREE.CanvasTexture(canvas); t.colorSpace = THREE.SRGBColorSpace
    for (let i = 0; i < count; i++) {
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false }))
      place(sprite); sprite.scale.set(.44, .44, 1); scene.add(sprite)
      reactions.push({ sprite, age: 0, dx: (Math.random() - .5) * .8, dz: (Math.random() - .5) * .8, texture: t })
    }
  }
  function reaction(id, emoji) {
    const g = findGroup(id); if (!g) return
    emojiBurst(emoji, (s) => s.position.set(g.group.position.x + g.normal * (.2 + Math.random() * .35), 1.6 + Math.random() * 1.4, g.group.position.z + (Math.random() - .5) * 1.4))
  }
  function addRipple(x, z, strength = 1) {
    const r = live.uRipples.value[rippleIndex], c = live.uRippleCol.value[rippleIndex]
    r.set(x, z, live.uTime.value, strength); c.copy(live.uBleed.value).lerp(new THREE.Color(current?.hue || ACCENT), .35).multiplyScalar(1.3)
    rippleIndex = (rippleIndex + 1) % RIPPLES
  }

  // ---- Intro: hands scene, burst, then a dolly into the rotunda.
  const HANDS_END = 4.6 + 2.0 * .62, REVEAL = 4.6
  function startIntro() {
    intro.hands?.dispose()
    intro.hands = createHandsIntro({ quality: quality.level })
    intro.hands.setSize(width, height)
    Object.assign(intro, { active: true, t: 0, stage: '' })
    enterZone('hub'); glide = null
    setStage('hands'); callbacks.onIntro?.(true)
  }
  function setStage(stage) { if (intro.stage !== stage) { intro.stage = stage; callbacks.onIntroStage?.(stage) } }
  function endIntro() {
    intro.active = false; intro.hands?.dispose(); intro.hands = null
    if (renderPass) { renderPass.scene = scene; renderPass.camera = camera }
    const s = (camera.aspect < .9 && current.portraitSpawn) || current.spawn
    camera.position.set(s.x, 1.7, s.z); yaw = targetYaw = 0; pitch = targetPitch = s.pitch
    setStage('done'); callbacks.onIntro?.(false)
  }
  function skipIntro() { if (intro.active) endIntro() }
  function updateIntro(realDt) {
    intro.t += realDt
    const t = intro.t
    if (t < HANDS_END && intro.hands) {
      const r = intro.hands.update(t)
      setStage(r.phase === 'approach' ? 'hands' : 'burst')
      callbacks.onIntroBurst?.(r.burst)
      return true
    }
    setStage('reveal')
    const k = clamp((t - HANDS_END) / REVEAL, 0, 1), e = expoOut(k)
    const s = (camera.aspect < .9 && current.portraitSpawn) || current.spawn
    camera.position.set(0, 1.7 + (1 - e) * 1.6, s.z + (1 - e) * 7.5)
    yaw = targetYaw = Math.sin(k * Math.PI) * .05; pitch = targetPitch = s.pitch - (1 - e) * .12
    if (k >= 1) endIntro()
    return false
  }

  // ---- Quality.
  function applyPixelRatio() {
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.7) * qualityScale[quality.level] * LOOK[styleId].pixel * dynScale)
    renderer.setSize(width, height, false)
    composer?.setSize(width, height)
  }
  function setQuality(mode) {
    quality.mode = mode
    const prev = quality.level
    if (mode !== 'auto') quality.level = { low: 0, medium: 1, high: 2 }[mode] ?? 1
    if (mode !== 'auto') dynScale = 1
    applyPixelRatio()
    if (quality.level === 2) {
      if (!composer) {
        composer = new EffectComposer(renderer)
        renderPass = new RenderPass(scene, camera); composer.addPass(renderPass)
        composer.addPass(new UnrealBloomPass(new THREE.Vector2(width, height), .48, .4, .96))
        composer.addPass(new OutputPass())
      }
      composer.setSize(width, height)
    } else if (composer) { composer.dispose(); composer = null; renderPass = null }
    live.uInk.value = styleId !== 'cinematic' ? 0 : quality.level === 0 ? 0 : 1
    if (prev !== quality.level || !zones.size) zones.forEach(applyQualityToZone)
    zones.forEach(shedEffects)
    callbacks.onQuality?.(quality.level, quality.mode)
  }
  // Low sheds the costliest overdraw: dust, light shafts and floor beams.
  function shedEffects(zone) { zone.group.traverse((o) => { if (o.userData.lowHide) o.visible = quality.level > 0 }); zone.artRoot?.traverse((o) => { if (o.userData.lowHide) o.visible = quality.level > 0 }) }
  function resize() {
    const rect = mount.getBoundingClientRect(); width = Math.max(1, rect.width); height = Math.max(1, rect.height)
    camera.aspect = width / height; camera.updateProjectionMatrix(); intro.hands?.setSize(width, height)
    setQuality(quality.mode)
    zones.forEach((z) => { const r = z.water?.getRenderTarget?.() || z.reflector?.getRenderTarget?.(); if (r) { const s = renderer.getPixelRatio() * .5; r.setSize(Math.round(width * s), Math.round(height * s)) } })
  }
  const ro = new ResizeObserver(resize); ro.observe(mount)
  resize()
  setArt(SEED_ART)
  startIntro()

  // ---- Frame loop.
  let last = performance.now(), frames = 0, fpsClock = 0, lastZoneReport = ''
  let loopError = null
  function animate(now) {
    if (disposed) return
    try { frame(now) } catch (err) {
      // Keep the world alive; report the first failure once rather than freezing.
      if (!loopError) { loopError = err; console.error(err); callbacks.onError?.(err) }
    }
    requestAnimationFrame(animate)
  }
  function frame(now) {
    const realDt = Math.min(.25, (now - last) / 1000 || .016), dt = Math.min(.05, realDt); last = now; time += dt
    live.uTime.value = time
    updateTransition(realDt)
    const handsFrame = intro.active ? updateIntro(realDt) : false
    if (!intro.active && !transition) {
      if (glide) {
        glide.t += dt
        const t = clamp(glide.t / glide.duration, 0, 1), e = quartOut(t)
        camera.position.x = glide.fromX + (glide.x - glide.fromX) * e
        camera.position.z = glide.fromZ + (glide.z - glide.fromZ) * e
        targetYaw = glide.fromYaw + (glide.yaw - glide.fromYaw) * e
        if (t >= 1) { const done = glide; glide = null; if (done.onDone) done.onDone(); else if (done.id) callbacks.onFocus?.(done.id) }
      } else {
        const forward = (moving.w || moving.ArrowUp ? 1 : 0) - (moving.s || moving.ArrowDown ? 1 : 0) - joystick.y
        const strafe = (moving.d || moving.ArrowRight ? 1 : 0) - (moving.a || moving.ArrowLeft ? 1 : 0) + joystick.x
        const magnitude = Math.min(1, Math.hypot(forward, strafe))
        const speed = moving.Shift ? 5.5 : 3.25
        const tx = (-Math.sin(yaw) * forward + Math.cos(yaw) * strafe) * speed
        const tz = (-Math.cos(yaw) * forward - Math.sin(yaw) * strafe) * speed
        const ease = 1 - Math.exp(-8 * dt)
        velX += (tx - velX) * ease; velZ += (tz - velZ) * ease
        const nx = camera.position.x + velX * dt, nz = camera.position.z + velZ * dt
        if (!current.collide(nx, camera.position.z)) camera.position.x = nx; else velX *= .2
        if (!current.collide(camera.position.x, nz)) camera.position.z = nz; else velZ *= .2
        live.uFlow.value.x += velX * dt * .25; live.uFlow.value.y += velZ * dt * .25
        if (magnitude > .08) {
          idle = 0
          stepPhase += dt * (moving.Shift ? 12 : 9) * magnitude
          if (stepPhase - stepClock > Math.PI) { stepClock = stepPhase; callbacks.onStep?.(current.kind); addRipple(camera.position.x, camera.position.z, current.kind === 'hub' ? 1 : .7) }
          headBob = Math.sin(stepPhase) * .035 * magnitude
        } else { headBob *= Math.exp(-8 * dt); idle += dt }
        camera.position.y = 1.7 + headBob
        exitCooldown -= dt
        if (exitCooldown <= 0 && magnitude > .05) {
          const exit = current.exitAt(camera.position.x, camera.position.z)
          if (exit) goThroughPortal(exit)
          else { const st = current.stairs?.find((q) => Math.hypot(camera.position.x - q.wx, camera.position.z - q.wz) < 1.15); if (st) travelTo(st.to, null, null, 'stairs') }
        }
      }
    }
    if (!handsFrame) {
      yaw += (targetYaw - yaw) * (1 - Math.exp(-13 * dt))
      pitch += (targetPitch - pitch) * (1 - Math.exp(-13 * dt))
      // Breathing: a slow idle sway that fades in once the visitor stands still.
      const sway = clamp(idle / 2.5, 0, 1) * (glide || focusId ? .35 : 1)
      camera.rotation.y = yaw + Math.sin(time * .23) * .007 * sway
      camera.rotation.x = pitch + Math.sin(time * .31 + 1) * .005 * sway
      const targetFov = baseFov() - (focusId ? 14 : 0)
      camera.fov += (targetFov - camera.fov) * (1 - Math.exp(-5 * dt)); camera.updateProjectionMatrix()
      live.uPlayer.value.copy(camera.position)
      sky.position.copy(camera.position); sky.material.uniforms.uTime.value = time
      updateBleed(realDt)
      current.update?.(time, dt, local())
      current.lift?.update(time, dt, hovered)
      current.props?.[styleId]?.update(time)
      updateDebris(dt)
      updateHover(dt)
      eggMeshes.forEach((m) => { const age = m.userData.popAt == null ? 9 : time - m.userData.popAt; m.scale.setScalar(age < .7 ? 1 + Math.sin(age / .7 * Math.PI) * .6 * (1 - age / .7) : 1) })
      current.artGroups?.forEach((g) => { if (g.animated && g.image.material.map) g.image.material.map.needsUpdate = true })
    }
    ceremony?.director.update(dt, realDt, time, current?.id === 'ceremony')
    updateGame(realDt, dt)
    reactions.forEach((p) => { p.age += dt; p.sprite.position.x += p.dx * dt; p.sprite.position.z += p.dz * dt; p.sprite.position.y += dt * .8; p.sprite.material.opacity = Math.max(0, 1 - p.age / 1.25); p.sprite.scale.setScalar(.35 + .24 * quartOut(clamp(p.age / .4, 0, 1))) })
    for (let i = reactions.length - 1; i >= 0; i--) if (reactions[i].age > 1.25) { const old = reactions[i]; old.sprite.removeFromParent(); old.sprite.material.dispose(); reactions.splice(i, 1); if (!old.keep && !reactions.some((r) => r.texture === old.texture)) old.texture.dispose() }
    if (frames % 10 === 0 && !intro.active) {
      const l = local(); callbacks.onPosition?.(l.x, l.z, yaw, current.id)
    }
    fpsClock += realDt; frames++; zoneClock += realDt
    if (fpsClock > 1) {
      quality.fps = Math.round(frames / fpsClock)
      if (quality.mode === 'auto' && !intro.active && !transition && zoneClock > 2) {
        const maxLevel = window.innerWidth < 650 ? 1 : 2
        if (quality.fps < 45) {
          steady = 0
          if (dynScale > .55) { dynScale = Math.max(.5, dynScale * .8); applyPixelRatio() }
          else if (quality.level > 0) { quality.level--; dynScale = .85; setQuality('auto') }
        } else if (quality.fps > 57) {
          steady++
          if (dynScale < 1 && steady >= 2) { dynScale = Math.min(1, dynScale * 1.12); applyPixelRatio(); steady = 0 }
          else if (dynScale >= 1 && steady >= 4 && quality.level < maxLevel) { quality.level++; dynScale = .8; setQuality('auto'); steady = 0 }
        } else steady = 0
      }
      callbacks.onFps?.(quality.fps, { calls: stats.calls, tris: stats.tris, scale: Math.round(renderer.getPixelRatio() * 100) / 100, dyn: Math.round(dynScale * 100), level: quality.level })
      frames = 0; fpsClock = 0
    }
    const drawScene = handsFrame ? intro.hands.scene : scene, drawCamera = handsFrame ? intro.hands.camera : camera
    renderer.info.reset()
    if (composer && (LOOK[styleId].bloom || handsFrame)) { renderPass.scene = drawScene; renderPass.camera = drawCamera; composer.render() }
    else renderer.render(drawScene, drawCamera)
    stats.calls = renderer.info.render.calls; stats.tris = renderer.info.render.triangles
  }
  function updateBleed(dt) {
    // Colour reacts to the player: nearby art (or portals) bleed into floor,
    // walls and fog with a smooth lerp.
    let r = 0, g = 0, b = 0, wsum = 0
    const px = camera.position.x, pz = camera.position.z
    // Cubed weights let the nearest piece dominate instead of averaging
    // complementary hues into grey.
    // The strongest nearby source wins outright; the smooth lerp below handles
    // the hand-off, so complementary hues never average into grey or mauve.
    let reach = 0, best = null
    const add = (color, x, z, k = 1) => { const d2 = (x - px) ** 2 + (z - pz) ** 2, w0 = Math.exp(-d2 / 48) * k; if (w0 > reach) { reach = w0; best = color } wsum += w0 }
    current.artGroups?.forEach((ag) => ag.item.open ? add(openTint.set(current.hue || ACCENT), ag.group.position.x, ag.group.position.z, .3) : add(dataFor(ag.item).color, ag.group.position.x, ag.group.position.z))
    current.portals?.forEach((p) => add(p.panel.material.uniforms.uHue.value, p.x, p.z, 1.2))
    if (current.kind === 'hall') add(new THREE.Color('#ffc95c'), ORIGINS.ceremony.x, ORIGINS.ceremony.z - 13, 3)
    const amt = clamp(reach * 1.4, 0, 1)
    if (best) { bleedTarget.copy(best); bleedTarget.getHSL(hsl); bleedTarget.setHSL(hsl.h, Math.max(hsl.s, .65), clamp(hsl.l, .45, .6)) }
    const k = 1 - Math.exp(-2.2 * dt)
    live.uBleed.value.lerp(bleedTarget, k)
    live.uBleedAmt.value += (amt - live.uBleedAmt.value) * k
    fogColor.copy(fogBase).lerp(live.uBleed.value, .14 * live.uBleedAmt.value)
    bleedLight.color.copy(live.uBleed.value)
    bleedLight.intensity = live.uBleedAmt.value * (current.kind === 'hub' ? 5 : 17)
    bleedLight.position.set(px - Math.sin(yaw) * 1.6, 2.3, pz - Math.cos(yaw) * 1.6)
    scene.fog.color.copy(fogColor)
    if (current.kind !== 'hub') scene.background.copy(fogColor)
  }
  requestAnimationFrame(animate)

  return {
    canvas: renderer.domElement, zones: ZONES,
    setArt, setQuality, setMoving: (key, value) => { moving[key] = value },
    clearInput: () => { moving = {}; joystick = { x: 0, y: 0 }; velX = velZ = 0 },
    setJoystick: (x, y) => { joystick = { x, y } }, setLook, pick, hover,
    startIntro, skipIntro, focusById, travelTo: (id) => travelTo(id, id === 'hub' && current?.id !== 'hub' ? ensureZone('hub').spawnFrom(current?.id) : null),
    startPanorama: () => { if (current?.id === 'panorama') current.startShow?.(); else travelTo('panorama', null, () => ensureZone('panorama').startShow?.()) },
    reaction, thumbFor,
    // Browse: focus the first piece in this room (or the collection's first) without aiming.
    browse: () => { const here = art.find((a) => placement.get(a.id)?.room === (current?.id === 'cubes' ? 'memes' : current?.id)) || art[0]; if (here) focusById(here.id) },
    startCeremony: () => travelTo('ceremony', null, () => ceremony?.director.start(), 'lift'),
    ride, floorOf, applyStyle, getStyle: () => styleId, startCoins, startMemeHunt, endGame: () => endGame(true), setScores: (scores) => { ensureZone('arcade').drawBoard(scores) },
    endCeremony: () => ceremony?.director.end(),
    clearFocus: () => { focusId = null },
    getZone: () => current?.id,
    dispose: () => {
      disposed = true; ro.disconnect(); intro.hands?.dispose(); envTarget.dispose()
      scene.traverse((o) => { o.geometry?.dispose(); if (o.material) { o.material.map?.dispose?.(); o.material.dispose?.() } })
      zones.forEach((z) => { z.water?.dispose?.(); z.reflector?.dispose?.() })
      composer?.dispose(); renderer.dispose(); renderer.domElement.remove()
    },
  }
}
