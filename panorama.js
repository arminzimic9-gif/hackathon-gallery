import * as THREE from 'three'
import { beamMaterial, portalMaterial } from './fx.js'
import { textTexture } from './art.js'

export const PANORAMA_ORIGIN = new THREE.Vector3(540, 0, 0)
const RADIUS = 8.7, SCREEN_Y = 3.05, SCREEN_H = 4.5

function fillScreen(canvas, item, sourceFor) {
  const g = canvas.getContext('2d'), w = canvas.width, h = canvas.height
  g.fillStyle = '#05080d'; g.fillRect(0, 0, w, h)
  const src = item && sourceFor(item)
  if (src) {
    const sw = src.naturalWidth || src.width, sh = src.naturalHeight || src.height
    const scale = Math.max(w / sw, h / sh), iw = sw * scale, ih = sh * scale
    g.drawImage(src, (w - iw) / 2, (h - ih) / 2, iw, ih)
  }
  const fade = g.createLinearGradient(0, 0, 0, h)
  fade.addColorStop(0, 'rgba(1,4,9,.18)'); fade.addColorStop(.6, 'rgba(1,4,9,0)'); fade.addColorStop(1, 'rgba(1,4,9,.62)')
  g.fillStyle = fade; g.fillRect(0, 0, w, h)
}

function makeScreens(group, count, size, low) {
  const screens = [], pickables = []
  const step = THREE.MathUtils.degToRad(270 / count)
  const start = -Math.PI * .75 + step / 2
  const width = 2 * RADIUS * Math.tan(step / 2) - .11
  for (let i = 0; i < count; i++) {
    const a = start + i * step
    const canvas = document.createElement('canvas'); canvas.width = size; canvas.height = Math.round(size * 1.14)
    const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace
    texture.wrapS = THREE.ClampToEdgeWrapping; texture.repeat.x = .9
    const mat = new THREE.MeshBasicMaterial({ map: texture, toneMapped: false, side: THREE.DoubleSide })
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(width, SCREEN_H), mat)
    screen.position.set(Math.sin(a) * RADIUS, SCREEN_Y, -1 - Math.cos(a) * RADIUS)
    screen.rotation.y = -a
    screen.userData = { kind: 'art', id: null }; group.add(screen); pickables.push(screen)
    const border = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.PlaneGeometry(width + .06, SCREEN_H + .06)), new THREE.LineBasicMaterial({ color: '#26343d', transparent: true, opacity: .68 }))
    border.position.copy(screen.position); border.rotation.copy(screen.rotation); border.translateZ(.008); group.add(border)
    screens.push({ screen, mat, texture, canvas, phase: i * .16, item: null })
  }
  return { screens, pickables, low, group }
}

export function buildPanorama(ctx) {
  const { box, onStart } = ctx
  const group = new THREE.Group(); group.position.copy(PANORAMA_ORIGIN)
  const black = new THREE.MeshBasicMaterial({ color: '#010204', side: THREE.DoubleSide })
  box(0, -.13, -1, 21, .25, 21, black, group)
  const ceiling = box(0, 6.65, -1, 21, .2, 21, black, group)
  const rear = box(0, 3.2, 9.15, 21, 6.7, .2, black, group)
  // The circle remains the sole bright mark on the floor until the show starts.
  const circleMat = new THREE.MeshBasicMaterial({ color: '#f8fbff', toneMapped: false, side: THREE.DoubleSide })
  const circle = new THREE.Mesh(new THREE.RingGeometry(1.28, 1.34, 96), circleMat)
  circle.rotation.x = -Math.PI / 2; circle.position.set(0, .012, -1); group.add(circle)
  const guide = new THREE.Mesh(new THREE.PlaneGeometry(3.8, .42), new THREE.MeshBasicMaterial({ map: textTexture('STEP INTO THE CIRCLE', { width: 1024, height: 128, size: 65, weight: 600, color: '#b9c5cc', tracking: 9 }), transparent: true, depthWrite: false, toneMapped: false }))
  guide.position.set(0, 1.35, -8.35); group.add(guide)
  const highGroup = new THREE.Group(), lowGroup = new THREE.Group(); group.add(highGroup, lowGroup)
  const high = makeScreens(highGroup, 9, 512, false), low = makeScreens(lowGroup, 5, 256, true)
  lowGroup.visible = false
  const beams = []
  for (const a of [-.68, 0, .68]) {
    const light = new THREE.Mesh(new THREE.ConeGeometry(1.8, 5.7, 32, 1, true), beamMaterial(.14, '#d9e6ff', 5.7))
    light.position.set(Math.sin(a) * 3.8, 3.6, -1.5 + Math.cos(a) * 2)
    light.rotation.z = a * .35; light.userData.lowHide = true; light.renderOrder = 2; group.add(light); beams.push(light)
    const head = new THREE.Mesh(new THREE.CylinderGeometry(.23, .38, .52, 12), new THREE.MeshStandardMaterial({ color: '#1d2830', metalness: .65, roughness: .35 }))
    head.position.set(light.position.x, 6.23, light.position.z); group.add(head)
    const eye = new THREE.Mesh(new THREE.CircleGeometry(.16, 16), new THREE.MeshBasicMaterial({ color: '#ecf5ff', toneMapped: false }))
    eye.rotation.x = Math.PI / 2; eye.position.set(light.position.x, 5.93, light.position.z); group.add(eye)
  }
  const backPortal = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 3.65), portalMaterial('#9fd7ff'))
  backPortal.position.set(0, 2, 9.02); backPortal.rotation.y = Math.PI; backPortal.userData = { kind: 'portal', id: 'hub' }; group.add(backPortal)
  const onAir = new THREE.PointLight(0xb7d5ff, 0, 12, 1.7); onAir.position.set(0, 4.8, -1); group.add(onAir)
  let works = [], sourceFor = () => null, started = false, showTime = 0, slide = -1, style = 'cinematic'
  const sets = [high, low]
  function paint(set, epoch) {
    set.screens.forEach((s, i) => {
      const item = works.length ? works[(epoch + i * 2) % works.length] : null
      s.item = item; s.screen.userData.id = item?.id || null
      fillScreen(s.canvas, item, sourceFor); s.texture.needsUpdate = true
    })
  }
  function start() { started = true; showTime = 0; slide = 0; sets.forEach((s) => paint(s, 0)); onStart?.() }
  const zone = {
    id: 'panorama', name: 'Panorama Room', kind: 'panorama', hue: '#b8cfff', group, origin: PANORAMA_ORIGIN,
    styleOnly: true,
    spawn: { x: 0, z: 5.1, yaw: 0, pitch: .02 }, portraitSpawn: { x: 0, z: 5.8, yaw: 0, pitch: .06 },
    portalMeshes: [backPortal], pickables: [...high.pickables, ...low.pickables],
    setArt(items, source) { works = items; sourceFor = source; if (started) sets.forEach((s) => paint(s, slide)) },
    setQuality(level) { highGroup.visible = level > 0; lowGroup.visible = level === 0 },
    setStyle(id) {
      style = id
      circleMat.color.set(id === 'retro' ? '#fcbc3c' : id === 'voxel' ? '#82f5e6' : '#f8fbff')
      sets.forEach((set) => set.screens.forEach((s) => {
        s.texture.magFilter = id === 'cinematic' ? THREE.LinearFilter : THREE.NearestFilter
        s.texture.needsUpdate = true
      }))
    },
    startShow: start,
    get started() { return started },
    collide(x, z) { const lx = x - PANORAMA_ORIGIN.x, lz = z - PANORAMA_ORIGIN.z; return Math.hypot(lx, lz + 1) > 9.65 || lz > 8.7 },
    exitAt(x, z) { const lx = x - PANORAMA_ORIGIN.x, lz = z - PANORAMA_ORIGIN.z; return lz > 8.1 && Math.abs(lx) < 1.5 ? 'hub' : null },
    update(time, dt, player) {
      backPortal.material.uniforms.uTime.value = time
      if (!started && player && Math.hypot(player.x, player.z + 1) < 1.55) start()
      if (!started) { sets.forEach((s) => s.screens.forEach((p) => p.mat.color.setScalar(.16))); return }
      showTime += dt
      const epoch = Math.floor(showTime / 7)
      if (epoch !== slide) { slide = epoch; sets.forEach((s) => paint(s, epoch)) }
      const cue = Math.min(1, showTime / 1.6)
      const fade = .64 + .36 * Math.cos((showTime % 7) / 7 * Math.PI * 2) ** 8
      sets.forEach((set) => set.screens.forEach((s, i) => {
        const pan = (Math.sin(showTime * .12 + i * 1.17) + 1) * .045
        s.texture.offset.x = pan
        s.mat.color.setScalar(cue * fade * (style === 'retro' ? .9 : 1.1))
      }))
      onAir.intensity = 2.3 + Math.sin(time * .7) * .4
      circleMat.color.set(style === 'retro' ? '#fcbc3c' : style === 'voxel' ? '#82f5e6' : '#f8fbff')
    },
  }
  return zone
}
