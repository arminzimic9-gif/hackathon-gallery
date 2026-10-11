import * as THREE from 'three'
import { createFloaters, portalMaterial } from './fx.js'
import { radialGlow, textTexture } from './art.js'

export const PORTALS = [
  { id: 'memes', label: 'MEMES', hue: '#ff7a5c' },
  { id: 'art', label: 'ART', hue: '#d8ff69' },
  { id: 'apps', label: 'APPS & GAMES', hue: '#6ee7dd' },
  { id: 'agents', label: 'AGENTS', hue: '#a98bff' },
  { id: 'panorama', label: 'PANORAMA', hue: '#b8cfff' },
  { id: 'cubes', label: 'CUBE ROOM', hue: '#ff875c' },
  { id: 'ceremony', label: 'CEREMONY', hue: '#ffc95c' },
]
export const HUB_RADIUS = 11
export const PORTAL_SPREAD = THREE.MathUtils.degToRad(20)
const PORTAL_R = 9.7, SPREAD = PORTAL_SPREAD

// The rotunda: a water floor ringed by a colonnade, open to the night sky,
// with a curved wall of five tall portal panels facing the visitor.
export function buildHub(ctx) {
  const { box, mats, quality } = ctx
  const group = new THREE.Group()
  const R = HUB_RADIUS
  // Stone rim and a shallow step around the water.
  const rim = new THREE.Mesh(new THREE.RingGeometry(R - .15, R + 2.6, 72, 1), mats.stone)
  rim.rotation.x = -Math.PI / 2; rim.position.y = .16; group.add(rim)
  const lip = new THREE.Mesh(new THREE.TorusGeometry(R - .1, .1, 8, 96), mats.frameEdge)
  lip.rotation.x = Math.PI / 2; lip.position.y = .17; group.add(lip)
  // Colonnade: columns with bases and capitals, an entablature ring above.
  const colGeo = new THREE.CylinderGeometry(.34, .4, 7, 18), capGeo = new THREE.BoxGeometry(1, .34, 1), baseGeo = new THREE.BoxGeometry(1.05, .4, 1.05)
  const COLS = 20
  for (let i = 0; i < COLS; i++) {
    const a = i / COLS * Math.PI * 2, x = Math.sin(a) * (R + 1.5), z = Math.cos(a) * (R + 1.5)
    const col = new THREE.Mesh(colGeo, mats.stone); col.position.set(x, 3.7, z); group.add(col)
    const cap = new THREE.Mesh(capGeo, mats.stone); cap.position.set(x, 7.35, z); cap.rotation.y = a; group.add(cap)
    const base = new THREE.Mesh(baseGeo, mats.stone); base.position.set(x, .36, z); base.rotation.y = a; group.add(base)
  }
  const ent = new THREE.Mesh(new THREE.CylinderGeometry(R + 2.2, R + 2.2, .7, 72, 1, true), mats.stone)
  ent.material = mats.stone; ent.position.y = 7.85; group.add(ent)
  const entIn = new THREE.Mesh(new THREE.CylinderGeometry(R + .9, R + .9, .7, 72, 1, true), mats.stoneBack)
  entIn.position.y = 7.85; group.add(entIn)
  const entLine = new THREE.Mesh(new THREE.TorusGeometry(R + .92, .03, 6, 120), mats.neon)
  entLine.rotation.x = Math.PI / 2; entLine.position.y = 7.45; group.add(entLine)
  // Low outer parapet keeps the horizon dark beyond the colonnade.
  const parapet = new THREE.Mesh(new THREE.CylinderGeometry(R + 3.4, R + 3.4, 2.2, 72, 1, true), mats.stoneBack)
  parapet.position.y = 1.1; group.add(parapet)
  // Curved backing wall behind the portal arc.
  const wallArc = SPREAD * 7.8
  const backWall = new THREE.Mesh(new THREE.CylinderGeometry(R + .55, R + .55, 6.4, 48, 1, true, Math.PI - wallArc / 2, wallArc), mats.wallBack)
  backWall.position.y = 3.2; group.add(backWall)

  const portals = PORTALS.map((p, i) => {
    const a = (i - (PORTALS.length - 1) / 2) * SPREAD
    const x = Math.sin(a) * PORTAL_R, z = -Math.cos(a) * PORTAL_R
    const holder = new THREE.Group(); holder.position.set(x, 0, z); holder.rotation.y = -a; group.add(holder)
    const panel = new THREE.Mesh(new THREE.PlaneGeometry(2.25, 5.1), portalMaterial(p.hue))
    panel.position.y = 3.05; holder.add(panel)
    const frameMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(p.hue).multiplyScalar(1.5), toneMapped: false })
    for (const [w, h, px, py] of [[2.45, .05, 0, 5.62], [2.45, .05, 0, .48], [.05, 5.15, -1.2, 3.05], [.05, 5.15, 1.2, 3.05]]) box(px, py, -.02, w, h, .05, frameMat, holder)
    // Titles float above each panel, like the portal-wall reference.
    const plate = new THREE.Mesh(new THREE.PlaneGeometry(2.55, .64), new THREE.MeshBasicMaterial({ color: '#05080b', transparent: true, opacity: .68, depthWrite: false }))
    plate.position.set(0, 6.03, .02); holder.add(plate)
    const label = new THREE.Mesh(new THREE.PlaneGeometry(2.4, .38), new THREE.MeshBasicMaterial({ map: textTexture(p.label, { width: 1024, height: 168, size: p.label.length > 8 ? 73 : 94, weight: 700, color: '#f6faf3', tracking: 7 }), transparent: true, toneMapped: false, depthWrite: false }))
    label.position.set(0, 6.07, .03); holder.add(label)
    const num = new THREE.Mesh(new THREE.PlaneGeometry(.9, .2), new THREE.MeshBasicMaterial({ map: textTexture('0' + (i + 1), { width: 256, height: 64, size: 40, weight: 600, color: p.hue, tracking: 6 }), transparent: true, toneMapped: false, depthWrite: false }))
    num.position.set(0, .76, .03); holder.add(num)
    // A pool of the portal's colour on the water in front of it.
    const glow = new THREE.PointLight(new THREE.Color(p.hue), 5, 7, 1.6); glow.position.set(0, 2.2, 1.3); holder.add(glow)
    panel.userData = { kind: 'portal', id: p.id }
    return { ...p, index: i, holder, panel, glow, x, z, angle: a, hover: 0, baseY: 0 }
  })
  const moon = new THREE.DirectionalLight(0xbcd2ff, .55); moon.position.set(14, 22, -26); group.add(moon)
  // A pale planet sits just over the curved wall and reads clearly from the entrance.
  const planet = new THREE.Mesh(new THREE.SphereGeometry(.92, 24, 16), new THREE.MeshPhysicalMaterial({ color: '#d2ddff', emissive: '#6478ac', emissiveIntensity: .55, roughness: .92 }))
  planet.position.set(0, 9.55, -12.4); group.add(planet)
  const planetHalo = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 3.2), new THREE.MeshBasicMaterial({ map: radialGlow(), color: '#7fa5e8', transparent: true, opacity: .2, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }))
  planetHalo.position.set(0, 9.55, -12.45); group.add(planetHalo)
  // The glossy inflated knot is the rotunda's sculptural centrepiece.
  const blobMat = new THREE.MeshStandardMaterial({ color: '#468fff', metalness: .18, roughness: .2, envMapIntensity: 1.5 })
  const morph = { value: 0 }
  blobMat.onBeforeCompile = (shader) => {
    shader.uniforms.uMorph = morph
    shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nuniform float uMorph;')
      .replace('#include <begin_vertex>', `vec3 transformed = vec3(position);
        transformed += normal * (sin(position.x * 2.2 + uMorph * 1.1) * .085
        + sin(position.y * 3.4 - uMorph * .72) * .065);`)
  }
  blobMat.customProgramCacheKey = () => 'hub-blob-morph-v1'
  const sculpture = new THREE.Mesh(new THREE.TorusKnotGeometry(.96, .42, 64, 10, 2, 3), blobMat)
  sculpture.position.set(0, 3.45, .8); sculpture.rotation.x = .23; group.add(sculpture)
  const satellites = []
  for (let i = 0; i < 5; i++) {
    const sphere = new THREE.Mesh(new THREE.SphereGeometry(.10 + (i % 3) * .04, 12, 8), blobMat)
    group.add(sphere); satellites.push(sphere)
  }
  // Low grass silhouettes feather the foreground edge of the water.
  const bladeShape = new THREE.BufferGeometry()
  bladeShape.setAttribute('position', new THREE.Float32BufferAttribute([-.045, 0, 0, .045, 0, 0, 0, .55, .06], 3))
  bladeShape.computeVertexNormals()
  const grassMat = new THREE.MeshBasicMaterial({ color: '#10201e', side: THREE.DoubleSide })
  const grass = new THREE.InstancedMesh(bladeShape, grassMat, 115)
  const dummy = new THREE.Object3D()
  for (let i = 0; i < 115; i++) {
    const a = -Math.PI * .48 + i / 115 * Math.PI * .96, r = 10.2 + (i * 17 % 11) * .045
    dummy.position.set(Math.sin(a) * r, .16, Math.cos(a) * r)
    dummy.rotation.set(0, a + i * 1.13, (i % 7 - 3) * .07)
    dummy.scale.set(.5 + i % 5 * .17, .5 + i % 6 * .2, 1)
    dummy.updateMatrix(); grass.setMatrixAt(i, dummy.matrix)
  }
  group.add(grass)
  const waterLights = []
  for (let i = 0; i < 8; i++) {
    const a = i * Math.PI * 2 / 8 + .22, r = 3.5 + i % 3 * 1.3
    const orb = new THREE.Mesh(new THREE.SphereGeometry(.12 + (i % 3) * .035, 12, 8), new THREE.MeshBasicMaterial({ color: PORTALS[i % PORTALS.length].hue, toneMapped: false }))
    orb.position.set(Math.sin(a) * r, .32, Math.cos(a) * r); group.add(orb); waterLights.push(orb)
  }
  const orbCount = [26, 44, 64][quality]
  const orbs = createFloaters({
    count: orbCount, size: .5, colors: ['#d8ff69', '#ff7a5c', '#6ee7dd', '#a98bff', '#ffc95c', '#e8f3ff'], height: [1.2, 6.4], speed: .35,
    area: () => { const a = Math.random() * Math.PI * 2, r = 2.5 + Math.random() * (R - 3.5); return { x: Math.sin(a) * r, z: Math.cos(a) * r } },
  })
  group.add(orbs)
  const dust = createFloaters({
    count: [90, 160, 240][quality], size: .07, colors: ['#e8f7d0'], height: [.3, 7], speed: .15, opacity: .55,
    area: () => { const a = Math.random() * Math.PI * 2, r = Math.random() * R; return { x: Math.sin(a) * r, z: Math.cos(a) * r } },
  })
  dust.userData.lowHide = true; group.add(dust)

  const zone = {
    id: 'hub', name: 'The Rotunda', kind: 'hub', group, hue: '#9fd7ff',
    spawn: { x: 0, z: 5.6, yaw: 0, pitch: .08 }, portraitSpawn: { x: 0, z: 7.6, yaw: 0, pitch: .1 },
    portals, floaters: [orbs, dust],
    setQuality(level) { portals.forEach((p) => { p.glow.visible = level > 0 }); satellites.forEach((s, i) => { s.visible = level > 0 || i < 2 }) },
    setStyle(id) {
      blobMat.color.set(id === 'retro' ? '#fcbc3c' : id === 'voxel' ? '#69d5dd' : '#468fff')
      blobMat.flatShading = id !== 'cinematic'; blobMat.roughness = id === 'cinematic' ? .19 : .65; blobMat.needsUpdate = true
      grassMat.color.set(id === 'retro' ? '#184218' : id === 'voxel' ? '#283d30' : '#10201e')
    },
    portalMeshes: portals.map((p) => p.panel),
    collide(x, z) { return Math.hypot(x, z) > R - .75 },
    exitAt(x, z) {
      for (const p of portals) if (Math.hypot(x - p.x * .93, z - p.z * .93) < 1.05) return p.id
      return null
    },
    spawnFrom(id) {
      const p = portals.find((q) => q.id === id)
      if (!p) return zone.spawn
      // Arrive in front of the portal you came through, facing the rotunda centre.
      return { x: p.x * .7, z: p.z * .7, yaw: Math.PI - p.angle, pitch: .04 }
    },
    update(time, dt) {
      morph.value = time
      sculpture.rotation.y = time * .12
      sculpture.scale.setScalar(1 + Math.sin(time * 1.04) * .025)
      satellites.forEach((s, i) => {
        const a = time * (.22 + i * .025) + i * Math.PI * 2 / satellites.length
        s.position.set(Math.cos(a) * (1.55 + i % 2 * .24), 3.25 + Math.sin(a * 1.7) * .62, .8 + Math.sin(a) * (1.55 + i % 2 * .24))
      })
      waterLights.forEach((o, i) => { o.position.y = .32 + Math.sin(time * 1.1 + i * 1.8) * .085 })
      portals.forEach((p) => {
        p.holder.position.y = Math.sin(time * .6 + p.index * 1.3) * .06
        p.panel.material.uniforms.uTime.value = time
        p.panel.material.uniforms.uHover.value += (p.hover - p.panel.material.uniforms.uHover.value) * (1 - Math.exp(-6 * dt))
        p.glow.intensity = 4 + Math.sin(time * 1.1 + p.index) * 1.2 + p.panel.material.uniforms.uHover.value * 5
      })
      orbs.material.uniforms.uTime.value = time; dust.material.uniforms.uTime.value = time
    },
  }
  return zone
}
