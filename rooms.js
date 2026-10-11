import * as THREE from 'three'
import { beamMaterial, createFloaters } from './fx.js'
import { textTexture } from './art.js'

export const ROOM_DEFS = [
  { id: 'memes', name: 'Memes', hue: '#ff7a5c', kicker: 'HALL OF MEMES' },
  { id: 'art', name: 'Art', hue: '#d8ff69', kicker: 'THE PAINTED SIGNAL' },
  { id: 'apps', name: 'Apps & Games', hue: '#6ee7dd', kicker: 'BUILT AND PLAYED' },
  { id: 'agents', name: 'Agents', hue: '#a98bff', kicker: 'MINDS AT WORK' },
]
export const ROOM = { halfLength: 11, walkX: 3.95, screenX: 4.6, nicheX: 6.2, height: 9.6, bays: [8.1, 2.7, -2.7, -8.1] }

// One arched wall: a solid screen with semicircular-headed openings per bay.
function arcadeShape(length, height, bays, archHalf, spring) {
  const shape = new THREE.Shape()
  shape.moveTo(-length / 2, 0); shape.lineTo(length / 2, 0); shape.lineTo(length / 2, height); shape.lineTo(-length / 2, height); shape.lineTo(-length / 2, 0)
  for (const c of bays) {
    const hole = new THREE.Path()
    hole.moveTo(c - archHalf, 0); hole.lineTo(c + archHalf, 0); hole.lineTo(c + archHalf, spring)
    hole.absarc(c, spring, archHalf, 0, Math.PI, false)
    hole.lineTo(c - archHalf, 0)
    shape.holes.push(hole)
  }
  return shape
}

// A classical gallery (Uffizi-like): arcades of arched niches holding the art,
// a tall arched window above every bay pouring moonlight, a ribbed barrel
// vault, and a glowing return arch back to the rotunda behind the entrance.
export function buildRoom(ctx, def, origin) {
  const { box, mats, quality } = ctx
  const group = new THREE.Group(); group.position.copy(origin)
  const { halfLength: L, screenX, nicheX, height: H, bays } = ROOM
  const len = L * 2
  box(0, -.18, 0, nicheX * 2 + .4, .36, len, mats.floor, group)
  // Arcade screens with arched openings (extruded so arches have real depth).
  const arcGeo = new THREE.ExtrudeGeometry(arcadeShape(len, H, bays, 1.95, 4.5), { depth: .6, bevelEnabled: false, curveSegments: 14 })
  for (const side of [-1, 1]) {
    // Rotating the extrusion by ±90° maps its depth to ±x, so the inner face sits at ±screenX.
    const arc = new THREE.Mesh(arcGeo, mats.arch)
    arc.rotation.y = side * Math.PI / 2; arc.position.x = side * screenX
    group.add(arc)
    // Keystone accents and impost lines in the accent colour.
    box(side * (screenX - .03), H - .06, 0, .05, .05, len, mats.frameEdge, group)
    // Niche back wall and niche ceiling; a tall clerestory window above every
    // arch pours moonlight down into the corridor.
    box(side * nicheX, H / 2, 0, .3, H, len, mats.wall, group)
    box(side * (screenX + nicheX + .6) / 2, 6.75, 0, nicheX - screenX - .5, .2, len, mats.ceiling, group)
    for (const c of bays) {
      const win = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 1.9), mats.window)
      win.position.set(side * (screenX - .03), 7.5, c); win.rotation.y = -side * Math.PI / 2; group.add(win)
      const head = new THREE.Mesh(new THREE.CircleGeometry(.6, 24, 0, Math.PI), mats.window)
      head.position.set(side * (screenX - .03), 8.45, c); head.rotation.y = -side * Math.PI / 2; group.add(head)
      box(side * (screenX - .05), 7.75, c, .04, 2.4, .05, mats.mullion, group)
      box(side * (screenX - .05), 7.6, c, .04, .05, 1.2, mats.mullion, group)
      box(side * (screenX - .05), 6.5, c, .05, .05, 1.4, mats.frameEdge, group)
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(.6, 1.7, 7.4, 18, 1, true), beamMaterial(.12, '#ffd6a0', 7.4))
      shaft.position.set(side * 2.75, 4.35, c); shaft.rotation.z = -side * .5; shaft.renderOrder = 2; shaft.userData.lowHide = true; group.add(shaft)
    }
  }
  // Ribbed barrel vault spanning the arcades.
  const vaultR = screenX + .3
  const vault = new THREE.Mesh(new THREE.CylinderGeometry(vaultR, vaultR, len, 36, 1, true, Math.PI / 2, Math.PI), mats.vault)
  vault.rotation.x = Math.PI / 2; vault.position.y = H; group.add(vault)
  const ribGeo = new THREE.TorusGeometry(vaultR - .06, .1, 6, 36, Math.PI)
  for (const z of [-L + .2, -5.4, 0, 5.4, L - .2]) { const rib = new THREE.Mesh(ribGeo, mats.trim); rib.position.set(0, H, z); group.add(rib) }
  const ridge = new THREE.Mesh(new THREE.BoxGeometry(.05, .05, len), mats.neon); ridge.position.set(0, H + vaultR - .12, 0); group.add(ridge)
  // End walls: a tall triple window at the far end, the return arch behind the entrance.
  box(0, H / 2 + 2.5, -L, nicheX * 2, H + 5, .4, mats.wall, group)
  box(0, H / 2 + 2.5, L, nicheX * 2, H + 5, .4, mats.wall, group)
  for (const x of [-2.2, 0, 2.2]) {
    const w = new THREE.Mesh(new THREE.PlaneGeometry(x ? 1.3 : 1.7, x ? 4.6 : 5.6), mats.window)
    w.position.set(x, x ? 7.3 : 7.6, -L + .21); group.add(w)
    const head = new THREE.Mesh(new THREE.CircleGeometry(x ? .65 : .85, 24, 0, Math.PI), mats.window)
    head.position.set(x, (x ? 7.3 + 2.3 : 7.6 + 2.8), -L + .21); group.add(head)
  }
  const endShaft = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 3.4, 9, 20, 1, true), beamMaterial(.1, '#ffd29a', 9))
  endShaft.position.set(0, 5.2, -L + 3.6); endShaft.rotation.x = -.55; endShaft.renderOrder = 2; endShaft.userData.lowHide = true; group.add(endShaft)
  const returnArch = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 4.4), ctx.portalMaterial('#9fd7ff'))
  returnArch.position.set(0, 2.25, L - .22); returnArch.rotation.y = Math.PI; group.add(returnArch)
  returnArch.userData = { kind: 'portal', id: 'hub' }
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(3.6, .45), new THREE.MeshBasicMaterial({ map: textTexture(def.name.toUpperCase(), { width: 1024, height: 128, size: 66, color: '#f4f8f1', tracking: 12 }), transparent: true, toneMapped: false, depthWrite: false }))
  sign.position.set(0, 3.35, -L + .22); group.add(sign)
  const kicker = new THREE.Mesh(new THREE.PlaneGeometry(3.6, .26), new THREE.MeshBasicMaterial({ map: textTexture(def.kicker, { width: 1024, height: 80, size: 36, weight: 600, color: def.hue, tracking: 10 }), transparent: true, toneMapped: false, depthWrite: false }))
  kicker.position.set(0, 2.82, -L + .22); group.add(kicker)
  const rule = new THREE.Mesh(new THREE.PlaneGeometry(1.2, .02), new THREE.MeshBasicMaterial({ color: new THREE.Color(def.hue).multiplyScalar(1.3), toneMapped: false })); rule.position.set(0, 3.02, -L + .22); group.add(rule)
  // Warm key lights re-lit in our palette, a cool moon fill from the windows.
  const lights = []
  for (const z of [6, -6]) { const l = new THREE.PointLight(0xffcf98, 28, 17, 1.45); l.position.set(0, 7.2, z); group.add(l); lights.push(l) }
  const tint = new THREE.PointLight(new THREE.Color(def.hue), 1.2, 9, 1.6); tint.position.set(0, 2.2, -L + 2); group.add(tint)
  const dust = createFloaters({ count: [70, 120, 180][quality], size: .06, colors: ['#f4ecd8'], height: [.3, 7.5], speed: .12, opacity: .5, area: () => ({ x: (Math.random() - .5) * 9, z: (Math.random() - .5) * len }) })
  dust.userData.lowHide = true; group.add(dust)
  const slots = []
  // Fill the middle bays first so a sparse room still shows its art from the entrance.
  ;[bays[1], bays[2], bays[0], bays[3]].forEach((z) => { for (const side of [-1, 1]) slots.push({ zone: def.id, side, x: origin.x + side * (nicheX - .17), y: 3.05, z: origin.z + z, normal: -side, maxH: 2.15, maxW: 2.5 }) })
  // Smaller pieces hang on the arcade piers between the arches.
  ;[0, 5.4, -5.4].forEach((z) => { for (const side of [-1, 1]) slots.push({ zone: def.id, side, x: origin.x + side * (screenX - .05), y: 2.75, z: origin.z + z, normal: -side, maxH: 1.45, maxW: 1.15, pier: true }) })
  const zone = {
    id: def.id, name: def.name, kind: 'room', hue: def.hue, group, slots, lights, floaters: [dust], origin,
    portalMeshes: [returnArch],
    spawn: { x: 0, z: L - 2.2, yaw: 0, pitch: .05 }, portraitSpawn: { x: 0, z: L - 1.6, yaw: 0, pitch: .05 },
    collide(x, z) { const lx = x - origin.x, lz = z - origin.z; return Math.abs(lx) > ROOM.walkX || Math.abs(lz) > L - .7 },
    exitAt(x, z) { const lx = x - origin.x, lz = z - origin.z; return lz > L - 1.25 && Math.abs(lx) < 1.5 ? 'hub' : null },
    update(time) {
      dust.material.uniforms.uTime.value = time
      lights.forEach((l, i) => { l.intensity = 26 + Math.sin(time * .7 + i * 2) * 3 })
      tint.intensity = 1.2 + Math.sin(time * 1.1) * .5
      returnArch.material.uniforms.uTime.value = time
    },
  }
  return zone
}
