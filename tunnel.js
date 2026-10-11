import * as THREE from 'three'
import { openWallCanvas, textTexture } from './art.js'
import { portalMaterial } from './fx.js'

export const TUNNEL_ORIGIN = new THREE.Vector3(450, 0, 0)
const WIDTH = 4.5, LENGTH = 22, HEIGHT = 4.4, ATLAS_COLS = 4

// One atlas and one mesh per detail level keep the image-lined passage cheap
// even though it contains many independently changing lightbox panels.
function makeAtlas(size, items, sourceFor) {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const g = canvas.getContext('2d'), cell = size / ATLAS_COLS
  for (let i = 0; i < ATLAS_COLS ** 2; i++) {
    const x = i % ATLAS_COLS * cell, y = Math.floor(i / ATLAS_COLS) * cell
    const item = items[i]
    const src = item ? sourceFor(item) : openWallCanvas(i + 1, '#72cbe3', .9)
    g.fillStyle = '#0a1017'; g.fillRect(x, y, cell, cell)
    if (src) {
      const iw = src.naturalWidth || src.width, ih = src.naturalHeight || src.height
      const scale = Math.max(cell / iw, cell / ih), w = iw * scale, h = ih * scale
      g.drawImage(src, x + (cell - w) / 2, y + (cell - h) / 2, w, h)
    }
    g.fillStyle = 'rgba(240,250,255,.06)'; g.fillRect(x, y, cell, cell)
  }
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 2
  return { canvas, texture }
}

function panelGeometry(detail) {
  const positions = [], uvs = [], colors = [], indices = [], tiles = []
  const zCount = detail === 'low' ? 6 : 9
  const wallRows = detail === 'low' ? 2 : 4
  const across = detail === 'low' ? 3 : 5
  const zEdges = Array.from({ length: zCount + 1 }, (_, i) => -10 + i * 20 / zCount)
  const rowEdges = Array.from({ length: wallRows + 1 }, (_, i) => .12 + i * (HEIGHT - .2) / wallRows)
  const xEdges = Array.from({ length: across + 1 }, (_, i) => -WIDTH / 2 + i * WIDTH / across)
  const inset = detail === 'low' ? .045 : .032
  const add = (corners, slot, center) => {
    const start = positions.length / 3
    corners.forEach((p) => { positions.push(...p); colors.push(.69, .75, .82) })
    for (let i = 0; i < 4; i++) uvs.push(0, 0)
    indices.push(start, start + 1, start + 2, start, start + 2, start + 3)
    tiles.push({ start, slot, center, lastSwap: 0 })
  }
  for (let zi = 0; zi < zCount; zi++) {
    const za = zEdges[zi] + inset, zb = zEdges[zi + 1] - inset
    for (let row = 0; row < wallRows; row++) {
      const ya = rowEdges[row] + inset, yb = rowEdges[row + 1] - inset
      for (const side of [-1, 1]) {
        const x = side * (WIDTH / 2 - .025)
        add([[x, ya, za], [x, ya, zb], [x, yb, zb], [x, yb, za]],
          (zi * 5 + row * 3 + (side + 1) * 4) % 16, { x, y: (ya + yb) / 2, z: (za + zb) / 2 })
      }
    }
    for (let col = 0; col < across; col++) {
      const xa = xEdges[col] + inset, xb = xEdges[col + 1] - inset
      // Stagger the joints a little: the reference is tiled, not a rigid grid.
      const insetZ = (zi + col) % 3 === 0 ? .13 : 0
      add([[xa, HEIGHT - .025, za + insetZ], [xb, HEIGHT - .025, za + insetZ], [xb, HEIGHT - .025, zb], [xa, HEIGHT - .025, zb]],
        (zi * 7 + col * 3 + 5) % 16, { x: (xa + xb) / 2, y: HEIGHT, z: (za + zb) / 2 })
      add([[xa, .032, za + insetZ], [xb, .032, za + insetZ], [xb, .032, zb], [xa, .032, zb]],
        (zi * 3 + col * 5 + 11) % 16, { x: (xa + xb) / 2, y: .032, z: (za + zb) / 2 })
    }
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  geometry.setIndex(indices); geometry.computeVertexNormals()
  const uv = geometry.getAttribute('uv')
  function setTileSlot(tile, slot) {
    tile.slot = slot
    const x = slot % 4, y = Math.floor(slot / 4), p = .012
    const left = x / 4 + p, right = (x + 1) / 4 - p
    const top = 1 - y / 4 - p, bottom = 1 - (y + 1) / 4 + p
    ;[[left, bottom], [right, bottom], [right, top], [left, top]].forEach(([u, v], i) => uv.setXY(tile.start + i, u, v))
    uv.needsUpdate = true
  }
  tiles.forEach((t) => setTileSlot(t, t.slot))
  return { geometry, tiles, setTileSlot }
}

export function buildTunnel(ctx) {
  const { box, mats } = ctx
  const group = new THREE.Group(); group.position.copy(TUNNEL_ORIGIN)
  const panels = []
  box(0, HEIGHT / 2, 0, WIDTH + .22, HEIGHT, LENGTH, new THREE.MeshBasicMaterial({ color: '#03070c', side: THREE.DoubleSide }), group)
  // The first metres are black mirror-like glass before the illuminated floor.
  const entrance = box(0, .016, 10.35, WIDTH, .032, 1.3, mats.roofFloor, group)
  entrance.material = entrance.material.clone()
  for (const [detail, size] of [['low', 512], ['high', 1024]]) {
    const built = panelGeometry(detail), atlas = makeAtlas(size, [], () => null)
    const material = new THREE.MeshBasicMaterial({ map: atlas.texture, vertexColors: true, side: THREE.DoubleSide, toneMapped: false })
    const mesh = new THREE.Mesh(built.geometry, material); mesh.frustumCulled = false
    mesh.visible = detail === 'high'; group.add(mesh)
    panels.push({ ...built, atlas, material, mesh, detail })
  }
  // Thin black glass bars and luminous edge ribs give the montage its depth.
  const ribMat = new THREE.MeshBasicMaterial({ color: '#0b1720', toneMapped: false })
  for (const z of [-10.1, -7.5, -4.9, -2.3, .3, 2.9, 5.5, 8.1, 10.1]) {
    box(-WIDTH / 2 + .025, HEIGHT / 2, z, .055, HEIGHT, .075, ribMat, group)
    box(WIDTH / 2 - .025, HEIGHT / 2, z, .055, HEIGHT, .075, ribMat, group)
    box(0, HEIGHT - .02, z, WIDTH, .05, .075, ribMat, group)
  }
  const lineMat = new THREE.MeshBasicMaterial({ color: '#bceef7', toneMapped: false })
  for (const side of [-1, 1]) box(side * (WIDTH / 2 - .06), .08, 0, .04, .08, 20.2, lineMat, group)
  const door = new THREE.Mesh(new THREE.PlaneGeometry(2.75, 3.6), portalMaterial('#ffc667'))
  door.position.set(0, 2.06, -10.8); group.add(door)
  door.userData = { kind: 'portal', id: 'art' }
  const returnDoor = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 3.4), portalMaterial('#78d5eb'))
  returnDoor.position.set(0, 2, 10.8); returnDoor.rotation.y = Math.PI; returnDoor.userData = { kind: 'portal', id: 'hub' }; group.add(returnDoor)
  const gold = new THREE.MeshBasicMaterial({ color: '#ffd18a', toneMapped: false })
  for (const [x, y, w, h] of [[0, 3.88, 3.1, .09], [0, .23, 3.1, .09], [-1.55, 2.05, .09, 3.67], [1.55, 2.05, .09, 3.67]]) box(x, y, -10.69, w, h, .08, gold, group)
  const label = new THREE.Mesh(new THREE.PlaneGeometry(3.2, .35), new THREE.MeshBasicMaterial({ map: textTexture('INFINITY TUNNEL', { width: 1024, height: 110, size: 70, color: '#ffdfaa', weight: 700, tracking: 8 }), transparent: true, toneMapped: false, depthWrite: false }))
  label.position.set(0, 4.12, -10.55); group.add(label)
  const goldLight = new THREE.PointLight(0xffbb68, 13, 8, 1.4); goldLight.position.set(0, 2.5, -9.2); group.add(goldLight)
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(WIDTH, 20), new THREE.MeshBasicMaterial({ color: '#a4c8d9', transparent: true, opacity: .075, depthWrite: false, side: THREE.DoubleSide }))
  glass.rotation.x = -Math.PI / 2; glass.position.y = .06; group.add(glass)
  let destination = 'art', count = 0, style = 'cinematic', lastTime = 0
  const zone = {
    id: 'tunnel', name: 'Infinity Tunnel', kind: 'tunnel', hue: '#80dcf0', group, origin: TUNNEL_ORIGIN,
    styleOnly: true,
    spawn: { x: 0, z: 9.25, yaw: 0, pitch: .04 },
    portraitSpawn: { x: 0, z: 9.45, yaw: 0, pitch: .07 },
    portalMeshes: [door, returnDoor],
    setDestination(id) { destination = id; door.userData.id = id },
    setArt(items, sourceFor) {
      count = Math.min(16, items.length)
      panels.forEach((p) => {
        const next = makeAtlas(p.detail === 'low' ? 512 : 1024, items.slice(0, 16), sourceFor)
        p.atlas.texture.dispose(); p.atlas = next; p.material.map = next.texture; p.material.needsUpdate = true
        p.material.map.magFilter = style === 'cinematic' ? THREE.LinearFilter : THREE.NearestFilter
      })
    },
    setQuality(level) { panels.forEach((p) => { p.mesh.visible = (level === 0) === (p.detail === 'low') }) },
    setStyle(id) {
      style = id
      panels.forEach((p) => {
        p.material.map.magFilter = id === 'cinematic' ? THREE.LinearFilter : THREE.NearestFilter
        p.material.map.needsUpdate = true
        p.material.color.set(id === 'retro' ? '#ffd4a7' : id === 'voxel' ? '#d7f1ff' : '#ffffff')
      })
      gold.color.set(id === 'retro' ? '#fcbc3c' : id === 'voxel' ? '#ffb347' : '#ffd18a')
      lineMat.color.set(id === 'retro' ? '#fcbc3c' : id === 'voxel' ? '#79dbd4' : '#bceef7')
    },
    collide(x, z) { const lx = x - TUNNEL_ORIGIN.x, lz = z - TUNNEL_ORIGIN.z; return Math.abs(lx) > WIDTH / 2 - .45 || Math.abs(lz) > LENGTH / 2 - .45 },
    exitAt(x, z) { const lx = x - TUNNEL_ORIGIN.x, lz = z - TUNNEL_ORIGIN.z; return Math.abs(lx) < 1.5 && (lz < -9.9 ? destination : lz > 9.9 ? 'hub' : null) },
    update(time, _dt, player) {
      door.material.uniforms.uTime.value = time; returnDoor.material.uniforms.uTime.value = time
      if (time - lastTime < .12) return
      lastTime = time
      const pz = player?.z ?? 0
      panels.forEach((p) => {
        if (!p.mesh.visible) return
        const color = p.geometry.getAttribute('color')
        p.tiles.forEach((tile, i) => {
          const d = Math.abs(tile.center.z - pz), brightness = .64 + .62 * Math.exp(-d * d / 12) + .07 * Math.sin(time * 1.2 + i)
          for (let j = 0; j < 4; j++) color.setXYZ(tile.start + j, brightness * .94, brightness, brightness * 1.05)
        })
        color.needsUpdate = true
        if (count > 1 && time - (p.lastSwap || 0) > 3.6) {
          const nearby = p.tiles.filter((t) => Math.abs(t.center.z - pz) < 3.3)
          if (nearby.length) {
            const tile = nearby[Math.floor((time * 7) % nearby.length)]
            p.setTileSlot(tile, (tile.slot + 1 + Math.floor(time / 4)) % 16)
          }
          p.lastSwap = time
        }
      })
      goldLight.intensity = 11 + Math.sin(time * .8) * 2
    },
  }
  return zone
}
