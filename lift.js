import * as THREE from 'three'
import { textTexture } from './art.js'

export const FLOORS = [
  { floor: 1, label: 'R', name: 'Rooftop Stage', zone: 'ceremony', hue: '#ffc95c' },
  { floor: 0, label: 'G', name: 'Gallery', zone: 'hub', hue: '#9fd7ff' },
  { floor: -1, label: 'B1', name: 'Underground Arcade', zone: 'arcade', hue: '#ff4fd8' },
]

// A glass lift: frame, sliding doors, a floor display and three 3D call
// buttons (pickable as kind 'lift'). Local +z faces the room it serves.
export function buildLift(ctx, { floor }) {
  const { box, mats } = ctx
  const group = new THREE.Group()
  const glass = new THREE.MeshPhysicalMaterial({ color: '#9fd7ff', roughness: .08, metalness: 0, transmission: 0, transparent: true, opacity: .16, depthWrite: false })
  box(0, 1.6, -1.2, 2.4, 3.2, .06, glass, group)
  for (const x of [-1.2, 1.2]) { box(x, 1.65, -.6, .12, 3.3, 1.3, mats.trim, group); box(x, 1.65, 0, .05, 3.3, .05, mats.frameEdge, group) }
  box(0, 3.35, -.6, 2.5, .2, 1.3, mats.trim, group)
  box(0, 3.25, .02, 2.4, .04, .04, mats.frameEdge, group)
  const cabinLight = new THREE.PointLight(0xdff2ff, 3, 4, 1.6); cabinLight.position.set(0, 2.8, -.6); group.add(cabinLight)
  const doorMat = new THREE.MeshStandardMaterial({ color: '#2b3438', metalness: .7, roughness: .28 })
  const doors = [-1, 1].map((side) => { const d = box(side * .55, 1.55, .04, 1.1, 3.1, .06, doorMat, group); d.userData.side = side; return d })
  const display = new THREE.Mesh(new THREE.PlaneGeometry(.7, .3), new THREE.MeshBasicMaterial({ toneMapped: false, transparent: true }))
  display.position.set(0, 3.62, .05); group.add(display)
  const setDisplay = (label) => { display.material.map?.dispose(); display.material.map = textTexture(label, { width: 256, height: 110, size: 72, color: '#ffd89a', bg: '#06080b' }); display.material.needsUpdate = true }
  setDisplay(FLOORS.find((f) => f.floor === floor).label)
  box(1.62, 1.35, .02, .42, 1.2, .08, mats.trim, group)
  const buttons = FLOORS.map((f, i) => {
    const here = f.floor === floor
    const b = new THREE.Mesh(new THREE.CylinderGeometry(.11, .11, .05, 20), new THREE.MeshBasicMaterial({ color: new THREE.Color(here ? '#ffd89a' : f.hue).multiplyScalar(here ? 1.4 : 1.1), toneMapped: false }))
    b.rotation.x = Math.PI / 2; b.position.set(1.62, 1.75 - i * .38, .09); group.add(b)
    const label = new THREE.Mesh(new THREE.PlaneGeometry(.18, .1), new THREE.MeshBasicMaterial({ map: textTexture(f.label, { width: 128, height: 72, size: 52, color: '#06080b' }), transparent: true, toneMapped: false, depthWrite: false }))
    label.position.set(1.62, 1.75 - i * .38, .12); group.add(label)
    b.userData = { kind: 'lift', floor: f.floor, here }
    return { mesh: b, label, floor: f.floor, base: .09, press: -9, hover: 0 }
  })
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.6, .26), new THREE.MeshBasicMaterial({ map: textTexture('LIFT  ·  R  G  B1', { width: 768, height: 120, size: 56, color: '#e6f2ff', tracking: 10 }), transparent: true, toneMapped: false, depthWrite: false }))
  sign.position.set(0, 3.9, .05); group.add(sign)
  let open = 1, target = 1
  return {
    group, buttons, setDisplay, pickables: buttons.map((b) => b.mesh),
    close() { target = 0 }, open() { target = 1 }, snap(v) { open = target = v },
    press(floorValue, time) { const b = buttons.find((x) => x.floor === floorValue); if (b) b.press = time },
    update(time, dt, hovered) {
      open += (target - open) * (1 - Math.exp(-6 * dt))
      doors.forEach((d) => { d.position.x = d.userData.side * (.55 + open * 1.05) })
      buttons.forEach((b) => {
        b.hover += ((hovered === b.mesh ? 1 : 0) - b.hover) * (1 - Math.exp(-10 * dt))
        const p = Math.max(0, 1 - (time - b.press) * 3)
        b.mesh.position.z = b.base - p * .04 + b.hover * .02
        b.mesh.scale.setScalar(1 + b.hover * .18 + p * .1)
      })
      cabinLight.intensity = 2.6 + Math.sin(time * 1.7) * .4
    },
  }
}

// Stairs: a short flight with a glowing sign; walking onto it triggers the floor change.
export function buildStairs(ctx, { dir, label }) {
  const { box, mats } = ctx
  const group = new THREE.Group()
  for (let i = 0; i < 7; i++) {
    const y = dir === 'up' ? i * .17 : -i * .17
    box(0, y + .08, -i * .32, 1.8, .16, .34, i % 2 ? mats.trim : mats.stone, group)
    box(0, y + .17, -i * .32 + .16, 1.8, .02, .03, mats.frameEdge, group)
  }
  for (const x of [-.95, .95]) box(x, dir === 'up' ? 1.2 : .5, -1, .06, .06, 2.4, mats.frameEdge, group)
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.9, .34), new THREE.MeshBasicMaterial({ map: textTexture((dir === 'up' ? 'UP  ·  ' : 'DOWN  ·  ') + label, { width: 768, height: 136, size: 58, color: '#e6f2ff', tracking: 6 }), transparent: true, toneMapped: false, depthWrite: false }))
  sign.position.set(0, 2.5, .2); group.add(sign)
  const glow = new THREE.PointLight(0x9fd7ff, 3, 4, 1.6); glow.position.set(0, 1.8, -.6); group.add(glow)
  return { group, sign }
}
