import * as THREE from 'three'

// Three looks for the same layout. Every texture is generated here, pixel by
// pixel, and original: no external assets, characters or logos.
export const STYLES = [
  { id: 'cinematic', name: 'Cinematic', blurb: 'Moonlit marble, glass and colour bleed', swatch: ['#0b1626', '#d8ff69', '#a98bff'] },
  { id: 'voxel', name: 'Voxel', blurb: 'Cube-built halls, pixel textures, chunky light', swatch: ['#5d4630', '#7f7f7f', '#5aa83a'] },
  { id: 'retro', name: 'Retro 8-bit', blurb: 'Bright bricks, pipes, ? blocks and coins', swatch: ['#5c94fc', '#c84c0c', '#fcbc3c'] },
]

function rng(seed) { let s = seed >>> 0; return () => ((s = Math.imul(s ^ (s >>> 15), 1 | s) + 0x6d2b79f5 | 0) >>> 0) / 4294967296 }
function tex(size, draw, seed = 1) {
  const c = document.createElement('canvas'); c.width = c.height = size
  const g = c.getContext('2d'); g.imageSmoothingEnabled = false
  draw(g, size, rng(seed))
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace; t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.generateMipmaps = false
  return t
}
const px = (g, x, y, c) => { g.fillStyle = c; g.fillRect(x, y, 1, 1) }
function noiseFill(g, n, r, palette) { for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) px(g, x, y, palette[Math.floor(r() * palette.length)]) }

export function buildStyleTextures() {
  const voxel = {
    stone: tex(16, (g, n, r) => { noiseFill(g, n, r, ['#7d7d7d', '#858585', '#6f6f6f', '#8f8f8f', '#767676']); for (let i = 0; i < 6; i++) px(g, Math.floor(r() * n), Math.floor(r() * n), '#5a5a5a') }, 3),
    brick: tex(16, (g, n, r) => { noiseFill(g, n, r, ['#7a7a7a', '#838383', '#717171']); g.fillStyle = '#4d4d4d'; for (let y = 0; y < n; y += 4) { g.fillRect(0, y, n, 1); for (let x = (y / 4) % 2 ? 0 : 4; x < n; x += 8) g.fillRect(x, y, 1, 4) } }, 5),
    plank: tex(16, (g, n, r) => { for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) px(g, x, y, ['#9c7a48', '#a8844f', '#8f6f40'][Math.floor(r() * 3)]); g.fillStyle = '#6b5130'; for (let y = 3; y < n; y += 4) g.fillRect(0, y, n, 1); for (let y = 0; y < n; y += 4) g.fillRect(((y * 7) % 13), y, 1, 3) }, 7),
    dark: tex(16, (g, n, r) => { noiseFill(g, n, r, ['#3b2f26', '#43352b', '#352a22', '#4a3b2f']); g.fillStyle = '#2a211b'; for (let y = 0; y < n; y += 8) g.fillRect(0, y, n, 1) }, 9),
    glow: tex(16, (g, n, r) => { noiseFill(g, n, r, ['#f6d27a', '#ffe7a3', '#e9b85a', '#ffd88f']); g.fillStyle = '#b07d2c'; g.fillRect(0, 0, n, 1); g.fillRect(0, 0, 1, n) }, 11),
    grass: tex(16, (g, n, r) => { noiseFill(g, n, r, ['#5aa83a', '#4f9a33', '#67b545', '#4a8f2f']) }, 13),
    water: tex(16, (g, n, r) => { noiseFill(g, n, r, ['#2f5fd0', '#3567d8', '#2a55c0', '#3b70e0']); g.fillStyle = '#5d8ff0'; for (let i = 0; i < 5; i++) g.fillRect(Math.floor(r() * 12), Math.floor(r() * n), 4, 1) }, 15),
  }
  const retro = {
    brick: tex(16, (g, n) => { g.fillStyle = '#c84c0c'; g.fillRect(0, 0, n, n); g.fillStyle = '#000'; for (let y = 0; y < n; y += 8) g.fillRect(0, y + 7, n, 1); for (let y = 0; y < n; y += 8) for (let x = (y / 8) % 2 ? 4 : 0; x < n; x += 8) g.fillRect(x, y, 1, 7); g.fillStyle = '#fc9838'; for (let y = 0; y < n; y += 8) g.fillRect(0, y, n, 1) }),
    ground: tex(16, (g, n) => { g.fillStyle = '#c84c0c'; g.fillRect(0, 0, n, n); g.fillStyle = '#fcbcb0'; g.fillRect(0, 0, n, 1); g.fillRect(0, 0, 1, n); g.fillStyle = '#000'; g.fillRect(n - 1, 0, 1, n); g.fillRect(0, n - 1, n, 1); g.fillRect(7, 1, 1, 6); g.fillRect(1, 7, 6, 1); g.fillStyle = '#7c1c00'; g.fillRect(9, 9, 5, 5) }),
    stone: tex(16, (g, n) => { g.fillStyle = '#9c9c9c'; g.fillRect(0, 0, n, n); g.fillStyle = '#fcfcfc'; g.fillRect(0, 0, n - 1, 1); g.fillRect(0, 0, 1, n - 1); g.fillStyle = '#585858'; g.fillRect(n - 1, 0, 1, n); g.fillRect(0, n - 1, n, 1); g.fillRect(4, 4, 2, 2); g.fillRect(10, 9, 2, 2) }),
    block: tex(16, (g, n) => { g.fillStyle = '#fcbc3c'; g.fillRect(0, 0, n, n); g.fillStyle = '#000'; g.fillRect(n - 1, 0, 1, n); g.fillRect(0, n - 1, n, 1); g.fillStyle = '#c84c0c'; [[1, 1], [14, 1], [1, 14], [14, 14]].forEach(([x, y]) => g.fillRect(x, y, 1, 1)); g.fillStyle = '#fcfcfc'; g.fillRect(5, 3, 6, 1); g.fillRect(4, 4, 2, 3); g.fillRect(10, 4, 2, 3); g.fillRect(8, 7, 2, 2); g.fillRect(7, 9, 2, 1); g.fillRect(7, 11, 2, 2); g.fillStyle = '#c84c0c'; g.fillRect(6, 4, 4, 1) }),
    pipe: tex(16, (g, n) => { const cols = ['#003c00', '#00a800', '#00a800', '#80d010', '#b8f818', '#80d010', '#00a800', '#00a800', '#00a800', '#00a800', '#008800', '#008800', '#006800', '#006800', '#003c00', '#000']; for (let x = 0; x < n; x++) { g.fillStyle = cols[x]; g.fillRect(x, 0, 1, n) } }),
    sky: tex(16, (g, n) => { g.fillStyle = '#5c94fc'; g.fillRect(0, 0, n, n) }),
    water: tex(16, (g, n) => { g.fillStyle = '#2038ec'; g.fillRect(0, 0, n, n); g.fillStyle = '#6888fc'; for (let x = 0; x < n; x += 4) { g.fillRect(x, 3, 2, 1); g.fillRect(x + 2, 10, 2, 1) } }),
    coin: tex(16, (g, n) => { g.clearRect(0, 0, n, n); g.fillStyle = '#000'; g.fillRect(5, 1, 6, 14); g.fillStyle = '#fcbc3c'; g.fillRect(6, 2, 4, 12); g.fillStyle = '#fcfcfc'; g.fillRect(7, 4, 1, 8) }),
  }
  return { voxel, retro }
}

// Which texture each material role uses per style, with its world-space tiling.
export const ROLE_MAP = {
  voxel: { wall: ['brick', .6], arch: ['stone', .6], stone: ['stone', .6], wallBack: ['brick', .6], vault: ['plank', .6], floor: ['plank', .5], roofFloor: ['plank', .5], ceiling: ['dark', .6], trim: ['dark', .7], stage: ['plank', .6], podium: ['glow', .8], mullion: ['dark', .8], stoneBack: ['stone', .5] },
  retro: { wall: ['brick', .5], arch: ['stone', .5], stone: ['stone', .5], wallBack: ['brick', .5], vault: ['brick', .5], floor: ['ground', .5], roofFloor: ['ground', .5], ceiling: ['brick', .5], trim: ['stone', .6], stage: ['ground', .5], podium: ['block', .7], mullion: ['stone', .7], stoneBack: ['brick', .5] },
}
export const LOOK = {
  cinematic: { pixel: 1, hemi: .8, ambient: .3, exposure: 1.3, neon: '#d8ff69', edge: '#d8ff69', sky: '#0b1626', bloom: true, fogScale: 1 },
  voxel: { pixel: .42, hemi: 1.15, ambient: .55, exposure: 1.15, neon: '#ffb347', edge: '#ffd27a', sky: '#2a3f6b', bloom: false, fogScale: .8 },
  retro: { pixel: .34, hemi: 2.1, ambient: 1.1, exposure: 1, neon: '#fcfcfc', edge: '#fcbc3c', sky: '#5c94fc', bloom: false, fogScale: .25 },
}

// Style props per zone kind, in zone-local coordinates. Retro: floating
// question blocks, pipes and spinning coins. Voxel: torches and ore blocks.
const PROP_SPOTS = {
  hub: { blocks: [[-4.5, 3.4, 1.5], [4.5, 3.4, 1.5], [-2, 4.2, -3.5], [2, 4.2, -3.5]], pipes: [[-7.4, 3.6], [7.4, 3.6]], torches: [[-8.6, 1.2], [8.6, 1.2], [-6, -6.6], [6, -6.6]] },
  room: { blocks: [[-1.6, 5.2, 4], [1.6, 5.2, -1.5], [0, 5.6, -7]], pipes: [[-3.3, -9.6], [3.3, -9.6]], torches: [[-4.1, 6], [4.1, 6], [-4.1, -5.2], [4.1, -5.2]] },
  arcade: { blocks: [[-5, 3.6, -8], [5, 3.6, -8]], pipes: [[-10.6, -16.6], [10.6, -16.6]], torches: [[-9, -1.2], [9, -12], [-9, -12]] },
  roof: { blocks: [[-6, 3.8, -5], [0, 4.4, -6.5], [6, 3.8, -5]], pipes: [[-11.6, -15.8], [11.6, -15.8]], torches: [[-11.8, -4], [11.8, -4], [-11.8, -12], [11.8, -12]] },
}
export function buildStyleProps(style, zone, textures) {
  const group = new THREE.Group(), pickables = [], spots = PROP_SPOTS[zone.kind === 'hall' ? 'roof' : zone.kind] || PROP_SPOTS.room
  const items = []
  if (style === 'retro') {
    const blockMat = new THREE.MeshBasicMaterial({ map: textures.retro.block })
    const used = new THREE.MeshBasicMaterial({ color: '#a05a2c' })
    spots.blocks.forEach(([x, y, z], i) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(.8, .8, .8), blockMat); m.position.set(x, y, z); group.add(m)
      m.userData = { kind: 'prop', type: 'qblock', i }; pickables.push(m); items.push({ mesh: m, baseY: y, bump: -9, used: false, usedMat: used, mat: blockMat })
    })
    const pipeMat = new THREE.MeshBasicMaterial({ map: textures.retro.pipe })
    spots.pipes.forEach(([x, z]) => {
      const body = new THREE.Mesh(new THREE.CylinderGeometry(.62, .62, 1.6, 16), pipeMat); body.position.set(x, .8, z); group.add(body)
      const rim = new THREE.Mesh(new THREE.CylinderGeometry(.78, .78, .42, 16), pipeMat); rim.position.set(x, 1.75, z); group.add(rim)
      rim.userData = { kind: 'prop', type: 'pipe' }; pickables.push(rim); items.push({ mesh: rim, baseY: 1.75, bump: -9, pipe: true })
    })
    const coinMat = new THREE.MeshBasicMaterial({ map: textures.retro.coin, transparent: true, alphaTest: .5, side: THREE.DoubleSide })
    for (let i = 0; i < 6; i++) {
      const c = new THREE.Mesh(new THREE.PlaneGeometry(.5, .5), coinMat)
      const [x, y, z] = spots.blocks[i % spots.blocks.length]; c.position.set(x + (i % 2 ? .9 : -.9), y + .2, z + .6); group.add(c); items.push({ mesh: c, spin: true, baseY: y + .2, phase: i })
    }
  } else if (style === 'voxel') {
    const stickMat = new THREE.MeshLambertMaterial({ map: textures.voxel.plank }), fire = new THREE.MeshBasicMaterial({ map: textures.voxel.glow, toneMapped: false, color: new THREE.Color(1.4, 1.2, .9) })
    spots.torches.forEach(([x, z]) => {
      const stick = new THREE.Mesh(new THREE.BoxGeometry(.12, .7, .12), stickMat); stick.position.set(x, 1.95, z); group.add(stick)
      const flame = new THREE.Mesh(new THREE.BoxGeometry(.2, .2, .2), fire); flame.position.set(x, 2.4, z); group.add(flame); items.push({ mesh: flame, flicker: true })
    })
    const ores = [textures.voxel.grass, textures.voxel.stone, textures.voxel.glow]
    spots.blocks.forEach(([x, y, z], i) => {
      const mat = new THREE.MeshLambertMaterial({ map: ores[i % ores.length] })
      const m = new THREE.Mesh(new THREE.BoxGeometry(.9, .9, .9), mat); m.position.set(x, Math.min(y, 2.6) - 2, z); group.add(m)
      m.userData = { kind: 'prop', type: 'voxel', i }; pickables.push(m); items.push({ mesh: m, baseY: m.position.y, broken: -99, tint: mat.map })
    })
  }
  return {
    group, pickables, items,
    update(time) {
      items.forEach((it) => {
        if (it.spin) { it.mesh.rotation.y = time * 3 + it.phase; it.mesh.position.y = it.baseY + Math.sin(time * 2 + it.phase) * .1 }
        else if (it.flicker) it.mesh.scale.setScalar(.9 + Math.sin(time * 17 + it.mesh.position.x) * .08)
        else if (it.baseY !== undefined) {
          const b = Math.max(0, 1 - (time - it.bump) * 5)
          it.mesh.position.y = it.baseY + Math.sin(b * Math.PI) * .25 + (it.pipe ? 0 : Math.sin(time * 1.4 + (it.mesh.userData.i || 0)) * .05)
          if (it.broken !== undefined) it.mesh.visible = time - it.broken > 4
        }
      })
    },
  }
}
