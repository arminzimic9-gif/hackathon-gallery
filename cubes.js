import * as THREE from 'three'
import { openWallCanvas, radialGlow, textTexture } from './art.js'
import { portalMaterial } from './fx.js'

export const CUBES_ORIGIN = new THREE.Vector3(630, 0, 0)
const SLOTS = 16
const CUBES = [
  [-5.8, 2.5, -6.2, 1.8], [-2.5, 4.4, -7.4, 1.3], [1.9, 2.8, -7.2, 2.3], [5.3, 4.8, -5.5, 1.6],
  [-6.1, 4.6, -2.3, 1.25], [-3.1, 1.1, -2.7, 2.2], [.4, 4.5, -2.9, 1.7], [4.5, 2.35, -1.7, 2.0],
  [-5.8, .75, 2.1, 1.5], [-2.0, 3.6, 1.4, 1.25], [1.65, .95, 2.2, 1.9], [5.9, 3.55, 2.9, 1.45],
  [-4.3, 3.15, 5.2, 1.15], [3.6, .68, 5.3, 1.35],
]

function duotoneAtlas(size, items, sourceFor, style) {
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = size
  const g = canvas.getContext('2d'), cell = size / 4
  const palette = style === 'voxel' ? [[15, 33, 39], [112, 236, 220]] :
    style === 'retro' ? [[44, 15, 6], [252, 188, 60]] : [[33, 10, 15], [255, 124, 82]]
  for (let i = 0; i < SLOTS; i++) {
    const x = i % 4 * cell, y = Math.floor(i / 4) * cell
    const src = items[i] ? sourceFor(items[i]) : openWallCanvas(i + 1, i % 5 === 0 ? '#73dafa' : '#ff8d5a', 1)
    if (src) {
      const iw = src.naturalWidth || src.width, ih = src.naturalHeight || src.height
      const scale = Math.max(cell / iw, cell / ih)
      g.drawImage(src, x + (cell - iw * scale) / 2, y + (cell - ih * scale) / 2, iw * scale, ih * scale)
    }
    const image = g.getImageData(x, y, cell, cell), data = image.data
    const cool = i === 3 || i === 10 || i === 12
    const dark = cool ? [9, 31, 45] : palette[0], light = cool ? [113, 218, 242] : palette[1]
    for (let p = 0; p < data.length; p += 4) {
      const l = (data[p] * .23 + data[p + 1] * .62 + data[p + 2] * .15) / 255
      const v = style === 'retro' ? Math.round(l * 4) / 4 : style === 'voxel' ? Math.round(l * 7) / 7 : Math.pow(l, .72)
      for (let c = 0; c < 3; c++) data[p + c] = dark[c] * (1 - v) + light[c] * v
      data[p + 3] = 255
    }
    g.putImageData(image, x, y)
    g.fillStyle = cool ? 'rgba(149,238,255,.18)' : 'rgba(255,192,130,.12)'
    g.fillRect(x + 1, y + 1, cell - 2, cell - 2)
  }
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace; texture.magFilter = style === 'cinematic' ? THREE.LinearFilter : THREE.NearestFilter
  return texture
}

function cubeGeometry(slot) {
  const geometry = new THREE.BoxGeometry(1, 1, 1)
  const uv = geometry.getAttribute('uv'), x = slot % 4, y = Math.floor(slot / 4), pad = .008
  for (let i = 0; i < uv.count; i++) {
    const u = uv.getX(i), v = uv.getY(i)
    uv.setXY(i, (x + pad + u * (1 - 2 * pad)) / 4, 1 - (y + 1 - pad - v * (1 - 2 * pad)) / 4)
  }
  uv.needsUpdate = true
  return geometry
}

export function buildCubes(ctx) {
  const { box } = ctx
  const group = new THREE.Group(); group.position.copy(CUBES_ORIGIN)
  const wall = new THREE.MeshBasicMaterial({ color: '#050508', side: THREE.DoubleSide })
  box(0, -.16, 0, 19, .3, 19, wall, group)
  box(0, 7.55, 0, 19, .14, 19, wall, group)
  box(0, 3.8, -9.45, 19, 7.6, .12, wall, group)
  for (const side of [-1, 1]) box(side * 9.45, 3.8, 0, .12, 7.6, 19, wall, group)
  const accent = new THREE.MeshBasicMaterial({ color: '#ff8457', toneMapped: false })
  const blue = new THREE.MeshBasicMaterial({ color: '#74daff', toneMapped: false })
  for (const z of [-7.7, -3.7, .3, 4.3]) {
    box(-9.25, 4.1, z, .04, 4.4, .04, z === .3 ? blue : accent, group)
    box(9.25, 4.1, z, .04, 4.4, .04, z === -3.7 ? blue : accent, group)
  }
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(5.1, .55), new THREE.MeshBasicMaterial({ map: textTexture('CUBE ROOM', { width: 1024, height: 140, size: 80, color: '#ff9b68', weight: 700, tracking: 12 }), transparent: true, toneMapped: false, depthWrite: false }))
  sign.position.set(0, 6.25, -9.26); group.add(sign)
  const wires = [], cubes = [], pickables = [], geo = Array.from({ length: SLOTS }, (_, i) => cubeGeometry(i))
  const material = new THREE.MeshBasicMaterial({ color: '#ffffff', toneMapped: false })
  const glowMap = radialGlow()
  CUBES.forEach(([x, y, z, size], i) => {
    const slot = (i * 3 + (i % 4)) % SLOTS
    const pivot = new THREE.Group(); pivot.position.set(x, y, z); group.add(pivot)
    const cube = new THREE.Mesh(geo[slot], material); cube.scale.setScalar(size); cube.userData = { kind: 'art', id: null }; pivot.add(cube); pickables.push(cube)
    const edge = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(size + .012, size + .012, size + .012)), new THREE.LineBasicMaterial({ color: i === 3 || i === 10 ? '#8ae6ff' : '#ffb37c', transparent: true, opacity: .63 }))
    pivot.add(edge)
    const floor = y <= size / 2 + .04
    if (!floor) wires.push(x, 7.45, z, x, y + size / 2, z)
    const glow = new THREE.Mesh(new THREE.PlaneGeometry(size * 2.15, size * 2.15), new THREE.MeshBasicMaterial({ map: glowMap, color: i === 3 || i === 10 ? '#4ccbea' : '#ed6739', transparent: true, opacity: .18, depthWrite: false, blending: THREE.AdditiveBlending }))
    glow.rotation.x = -Math.PI / 2; glow.position.set(x, .016, z); group.add(glow)
    const entry = { pivot, cube, edge, glow, slot, phase: i * 1.73, item: null, lowHide: i >= 8, baseY: y, floor }
    cubes.push(entry)
  })
  const wireGeo = new THREE.BufferGeometry(); wireGeo.setAttribute('position', new THREE.Float32BufferAttribute(wires, 3))
  const wireMesh = new THREE.LineSegments(wireGeo, new THREE.LineBasicMaterial({ color: '#8c8991', transparent: true, opacity: .53 }))
  group.add(wireMesh)
  const door = new THREE.Mesh(new THREE.PlaneGeometry(2.5, 3.7), portalMaterial('#9fd7ff'))
  door.position.set(0, 2.05, 9.22); door.rotation.y = Math.PI; door.userData = { kind: 'portal', id: 'hub' }; group.add(door)
  const floorLight = new THREE.PointLight(0xff6b39, 3, 13, 1.5); floorLight.position.set(0, 4, -2); group.add(floorLight)
  let works = [], sourceFor = () => null, style = 'cinematic', quality = 1, atlas = null
  function refreshAtlas() {
    const size = quality === 0 ? 512 : 1024
    const next = duotoneAtlas(size, works, sourceFor, style)
    atlas?.dispose(); atlas = next; material.map = next; material.needsUpdate = true
    cubes.forEach((c) => { c.item = works[c.slot] || null; c.cube.userData.id = c.item?.id || null })
  }
  const zone = {
    id: 'cubes', name: 'Cube Room', kind: 'cubes', hue: '#ff875c', group, origin: CUBES_ORIGIN,
    styleOnly: true,
    spawn: { x: 0, z: 7.25, yaw: 0, pitch: .04 }, portraitSpawn: { x: 0, z: 7.55, yaw: 0, pitch: .08 },
    portalMeshes: [door], pickables,
    setArt(items, source) {
      const memes = items.filter((a) => a.room === 'memes')
      const featured = [...memes, ...items.filter((a) => a.room !== 'memes')]
      works = featured.length ? Array.from({ length: SLOTS }, (_, i) => featured[i % featured.length]) : []
      sourceFor = source; refreshAtlas()
    },
    setQuality(level) {
      if (quality === level) return
      quality = level; cubes.forEach((c) => { c.pivot.visible = level > 0 || !c.lowHide; c.glow.visible = level > 0 || !c.lowHide })
      refreshAtlas()
    },
    setStyle(id) {
      style = id; refreshAtlas()
      accent.color.set(id === 'voxel' ? '#77e9da' : id === 'retro' ? '#fcbc3c' : '#ff8457')
      floorLight.color.set(id === 'voxel' ? '#75e1dd' : id === 'retro' ? '#fcbc3c' : '#ff6b39')
    },
    focusTarget(id) { const c = cubes.find((x) => x.item?.id === id); return c?.pivot.getWorldPosition(new THREE.Vector3()) || null },
    collide(x, z) { const lx = x - CUBES_ORIGIN.x, lz = z - CUBES_ORIGIN.z; return Math.abs(lx) > 8.85 || Math.abs(lz) > 8.85 },
    exitAt(x, z) { const lx = x - CUBES_ORIGIN.x, lz = z - CUBES_ORIGIN.z; return lz > 8.3 && Math.abs(lx) < 1.5 ? 'hub' : null },
    update(time, dt) {
      door.material.uniforms.uTime.value = time
      const quant = style === 'cinematic' ? time : Math.floor(time * (style === 'retro' ? 4 : 8)) / (style === 'retro' ? 4 : 8)
      cubes.forEach((c) => {
        c.pivot.rotation.y = Math.sin(quant * .23 + c.phase) * .22 + quant * (c.slot % 2 ? .06 : -.05)
        if (!c.floor) c.pivot.position.y = c.baseY + Math.sin(quant * .75 + c.phase) * .09
      })
      floorLight.intensity = 2.7 + Math.sin(time * 1.1) * .55
    },
  }
  return zone
}
