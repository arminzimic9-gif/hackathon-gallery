import * as THREE from 'three'
import { beamMaterial } from './fx.js'
import { FONT, textTexture, wrapLines, radialGlow } from './art.js'

export const ACCENT = '#d8ff69'
const RANK_LABEL = { 1: 'FIRST PLACE', 2: 'SECOND PLACE', 3: 'THIRD PLACE' }
const PODIUM_X = { 1: 0, 2: -2.3, 3: 2.3 }
const UP = new THREE.Vector3(0, 1, 0)

// The rooftop Ceremony Stage (top floor) plus its show director. Stage-local
// coordinates: the lift lobby is at z=0, the screen truss near z=-16, x ±11.
export function buildCeremony(ctx) {
  const { box, mats, globals, callbacks } = ctx
  const group = new THREE.Group(); group.position.copy(ctx.origin)
  const H = 6.6
  // Open deck under the night sky, edged by a parapet with string lights.
  box(0, -.18, -8, 26, .36, 20, mats.roofFloor || mats.floor, group)
  for (const [x, z, w, d] of [[-13, -8, .4, 20], [13, -8, .4, 20], [0, -18, 26, .4], [0, 2, 26, .4]]) box(x, .55, z, w, 1.1, d, mats.stone, group)
  for (const [x, z, w, d] of [[-13, -8, .5, 20.1], [13, -8, .5, 20.1], [0, -18, 26.1, .5], [0, 2, 26.1, .5]]) box(x, 1.12, z, w, .06, d, mats.frameEdge, group)
  const bulbGeo = new THREE.SphereGeometry(.07, 8, 6)
  const bulbMat = new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffd89a').multiplyScalar(1.8), toneMapped: false })
  const bulbs = []
  for (const side of [-1, 1]) for (let i = 0; i <= 14; i++) {
    const t = i / 14, z = 1.4 - t * 18.6, sag = Math.sin(t * Math.PI * 4) ** 2 * .45
    const b = new THREE.Mesh(bulbGeo, bulbMat); b.position.set(side * 12.6, 3.4 - sag, z); group.add(b); bulbs.push(b)
  }
  for (const side of [-1, 1]) for (const z of [1.4, -8, -17.2]) box(side * 12.6, 1.8, z, .08, 3.4, .08, mats.trim, group)
  // A distant skyline glow ring sells the height.
  const skyline = new THREE.Group(); group.add(skyline)
  // Skyline: towers with lit windows and blinking antenna lights.
  const facade = (seed) => {
    const c = document.createElement('canvas'); c.width = 64; c.height = 128; const g = c.getContext('2d')
    g.fillStyle = '#070b12'; g.fillRect(0, 0, 64, 128)
    let r = seed; const rnd = () => ((r = (r * 9301 + 49297) % 233280) / 233280)
    for (let y = 4; y < 124; y += 6) for (let x = 4; x < 60; x += 6) { const v = rnd(); if (v > .62) { g.fillStyle = v > .93 ? '#9fd7ff' : v > .8 ? '#ffd28a' : '#c98a4a'; g.globalAlpha = .5 + rnd() * .5; g.fillRect(x, y, 3, 3) } }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.magFilter = THREE.NearestFilter; return t
  }
  const facades = [1, 7, 13].map((sd) => new THREE.MeshBasicMaterial({ map: facade(sd), toneMapped: false, fog: false, color: new THREE.Color(.9, .9, .95) }))
  const beacon = new THREE.MeshBasicMaterial({ color: new THREE.Color('#ff4a3a').multiplyScalar(2), toneMapped: false, fog: false })
  const beacons = []
  for (let i = 0; i < 54; i++) {
    const a = i / 54 * Math.PI * 2 + (i % 2) * .03, r = 44 + (i % 5) * 5, h = 6 + ((i * 37) % 17) + (i % 7 === 0 ? 12 : 0)
    const b = new THREE.Mesh(new THREE.BoxGeometry(3 + (i % 3), h, 3), facades[i % 3]); b.position.set(Math.sin(a) * r, -6 + h / 2, -8 + Math.cos(a) * r); b.lookAt(0, b.position.y, -8); skyline.add(b)
    if (i % 4 === 0) { const l = new THREE.Mesh(new THREE.SphereGeometry(.25, 6, 4), beacon); l.position.set(b.position.x, -6 + h + .6, b.position.z); skyline.add(l); beacons.push(l) }
  }
  // Moonlit haze low over the city, brightest toward the moon.
  for (const [a, sc, op] of [[0, 70, .2], [.7, 60, .26], [-1.2, 55, .16], [2.6, 60, .14]]) {
    const haze = new THREE.Mesh(new THREE.PlaneGeometry(sc, 14), new THREE.MeshBasicMaterial({ map: radialGlow(), color: '#6f8fc2', transparent: true, opacity: op, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }))
    haze.position.set(Math.sin(a) * 48, -1, -8 + Math.cos(a) * -48); haze.lookAt(0, -1, -8); skyline.add(haze)
  }
  const glowRing = new THREE.Mesh(new THREE.CylinderGeometry(52, 52, 5, 64, 1, true), new THREE.MeshBasicMaterial({ color: '#1d2a44', transparent: true, opacity: .55, side: THREE.BackSide, depthWrite: false, fog: false }))
  glowRing.position.set(0, -4, -8); group.add(glowRing)
  // String lights strung across the deck, over the audience.
  const wireMat = new THREE.LineBasicMaterial({ color: '#2a2f36' })
  for (const z of [-2.2, -5.6, -9]) {
    const pts = []
    for (let i = 0; i <= 18; i++) { const t = i / 18, x = -12.6 + t * 25.2, y = 3.6 - Math.sin(t * Math.PI) * .9; pts.push(new THREE.Vector3(x, y, z)); if (i % 2 === 1) { const b = new THREE.Mesh(bulbGeo, bulbMat); b.position.set(x, y - .1, z); group.add(b); bulbs.push(b) } }
    group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), wireMat))
  }
  // Audience: rows of glowing seats with a central aisle, many occupied by silhouettes.
  const seatGeo = new THREE.BoxGeometry(.52, .45, .5), backGeo = new THREE.BoxGeometry(.52, .62, .07), stripGeo = new THREE.BoxGeometry(.46, .04, .08)
  const seatMat = new THREE.MeshStandardMaterial({ color: '#141a21', roughness: .55, metalness: .3 })
  const stripMat = new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffc95c').multiplyScalar(1.4), toneMapped: false })
  const bodyGeo = new THREE.CapsuleGeometry(.2, .42, 3, 8), headGeo = new THREE.SphereGeometry(.13, 10, 8)
  const bodyMat = new THREE.MeshStandardMaterial({ color: '#06080b', roughness: .8 })
  const places = []
  for (let row = 0; row < 5; row++) for (let k = 0; k < 14; k++) {
    const x = (k < 7 ? -1.35 - k * .62 : 1.35 + (k - 7) * .62), z = -4.3 - row * 1.15 - Math.abs(x) * .03
    places.push({ x, z, sit: ((row * 31 + k * 17) % 10) < 5 })
  }
  const mk = (geo, mat, n) => { const m = new THREE.InstancedMesh(geo, mat, n); group.add(m); return m }
  const seats = mk(seatGeo, seatMat, places.length), backs = mk(backGeo, seatMat, places.length), strips = mk(stripGeo, stripMat, places.length)
  const sitters = places.filter((p) => p.sit), bodies = mk(bodyGeo, bodyMat, sitters.length), heads = mk(headGeo, bodyMat, sitters.length)
  const om = new THREE.Object3D()
  places.forEach((p, i) => {
    om.position.set(p.x, .23, p.z); om.rotation.set(0, 0, 0); om.updateMatrix(); seats.setMatrixAt(i, om.matrix)
    om.position.set(p.x, .62, p.z + .24); om.updateMatrix(); backs.setMatrixAt(i, om.matrix)
    om.position.set(p.x, .95, p.z + .27); om.updateMatrix(); strips.setMatrixAt(i, om.matrix)
  })
  sitters.forEach((p, i) => {
    om.position.set(p.x, .82, p.z + .05); om.rotation.set(0, 0, 0); om.updateMatrix(); bodies.setMatrixAt(i, om.matrix)
    om.position.set(p.x + Math.sin(i) * .03, 1.33, p.z + .02); om.updateMatrix(); heads.setMatrixAt(i, om.matrix)
  })
  const rim = new THREE.DirectionalLight(0x9fb8ff, .9); rim.position.set(0, 5, -16); group.add(rim)
  // Screen glow spilling across the wet deck toward the audience.
  const spill = new THREE.Mesh(new THREE.PlaneGeometry(12, 9), new THREE.MeshBasicMaterial({ map: radialGlow(), color: '#9fd7b0', transparent: true, opacity: .22, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }))
  spill.rotation.x = -Math.PI / 2; spill.position.set(0, .015, -9.5); group.add(spill)

  // Screen truss frame.
  for (const x of [-6.2, 6.2]) box(x, 3.2, -15.7, .25, 6.4, .25, mats.trim, group)
  box(0, 6.2, -15.7, 12.7, .25, .25, mats.trim, group)
  box(0, 6.36, -15.7, 12.7, .05, .05, mats.frameEdge, group)
  // Stage, monolithic screen and low podiums (1st centre, 2nd left, 3rd right).
  box(0, .3, -12.8, 16.5, .6, 5.2, mats.stage, group)
  box(0, .63, -10.27, 16.5, .05, .1, mats.frameEdge, group)
  box(0, 3.7, -15.65, 11.8, 4.4, .18, mats.trim, group)
  // Freestanding winners wall beside the screen.
  box(8.55, 3.2, -15.75, 4, 4.6, .2, mats.stone, group)
  for (const x of [6.7, 10.4]) box(x, 2.6, -15.4, .2, 5.2, .5, mats.trim, group)
  const podiums = {}
  for (const [rank, h] of [[2, .38], [1, .55], [3, .26]]) {
    const x = PODIUM_X[rank]
    podiums[rank] = box(x, .6 + h / 2, -11.2, 1.8, h, 1.5, mats.podium, group)
    box(x, .6 + h + .01, -10.44, 1.84, .03, .03, mats.frameEdge, group)
  }
  const fill = new THREE.PointLight(0xdcebe4, 30, 26, 1.5); fill.position.set(0, H - .3, -8); group.add(fill)
  const moonFill = new THREE.DirectionalLight(0xbcd2ff, .5); moonFill.position.set(14, 22, -26); group.add(moonFill)
  const spots = []
  for (const x of [-7.9, 7.9]) {
    const spot = new THREE.SpotLight(0xfff1dc, 26, 30, .24, .55, 1.25)
    spot.position.set(x, 6.2, -4.4); spot.target.position.set(0, 1, -13)
    group.add(spot, spot.target); spots.push(spot)
    const beam = new THREE.Mesh(new THREE.ConeGeometry(1.25, 1, 28, 1, true), beamMaterial(.05, '#fff3dd', 1))
    beam.renderOrder = 3; group.add(beam); spot.userData.beam = beam
  }
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(11.2, 4), new THREE.MeshBasicMaterial({ color: 0xeeeeee, toneMapped: false }))
  screen.position.set(0, 3.7, -15.45); group.add(screen)
  const winners = []
  for (const [index, rank] of [1, 2, 3].entries()) {
    const y = 4.75 - index * 1.25
    box(8.55, y, -15.58, 3.65, 1.04, .14, mats.trim, group)
    const plaque = new THREE.Mesh(new THREE.PlaneGeometry(3.4, .82), new THREE.MeshBasicMaterial({ color: 0xeeeeee, toneMapped: false }))
    plaque.position.set(8.55, y, -15.42); group.add(plaque)
    winners.push({ rank, plaque })
  }
  const wallLabel = new THREE.Mesh(new THREE.PlaneGeometry(3.7, .46), new THREE.MeshBasicMaterial({ map: textTexture('WINNERS WALL', { width: 1024, height: 128, size: 54, color: ACCENT, tracking: 8 }), transparent: true, toneMapped: false }))
  wallLabel.position.set(8.55, 5.55, -15.42); group.add(wallLabel)

  // Confetti is one fixed pool of points: bursts recycle parked particles.
  const CONFETTI = 360, confetti = []
  const cg = new THREE.BufferGeometry(), cpos = new Float32Array(CONFETTI * 3), ccol = new Float32Array(CONFETTI * 3)
  const palette = [ACCENT, '#f2f7ee', '#ff7a5c', '#8fe9dd'].map((c) => new THREE.Color(c))
  for (let i = 0; i < CONFETTI; i++) {
    confetti.push({ live: false, x: 0, y: -20, z: 0, vx: 0, vy: 0, vz: 0, spin: Math.random() * 6 })
    cpos[i * 3 + 1] = -20
    const col = palette[i % palette.length]; ccol.set([col.r, col.g, col.b], i * 3)
  }
  cg.setAttribute('position', new THREE.BufferAttribute(cpos, 3)); cg.setAttribute('color', new THREE.BufferAttribute(ccol, 3))
  const confettiMesh = new THREE.Points(cg, new THREE.PointsMaterial({ size: .085, vertexColors: true, transparent: true, opacity: .95, depthWrite: false, toneMapped: false }))
  confettiMesh.frustumCulled = false; group.add(confettiMesh)

  const state = { active: false, elapsed: 0, step: -1, timeline: [], dim: 0, idle: 0, idleSlot: -1, revealed: 0, view: null, confettiLive: false }
  const art = () => ctx.getArt()
  const winnerFor = (rank) => art().find((a) => a.winner_rank === rank && !a.placeholder)
  const showreel = () => { const all = art(), f = all.filter((a) => a.ceremony && !a.winner_rank); return (f.length ? f : all.filter((a) => !a.winner_rank)).slice(0, 6) }
  function drawFitted(c, source, x, y, w, h) {
    if (!source) return
    const iw = source.naturalWidth || source.width, ih = source.naturalHeight || source.height
    const fit = Math.min(w / iw, h / ih)
    c.drawImage(source, x + (w - iw * fit) / 2, y + (h - ih * fit) / 2, iw * fit, ih * fit)
  }
  function wrapText(c, text, x, y, maxWidth, lineHeight, maxLines = 3) {
    const lines = wrapLines(c, text, maxWidth).slice(0, maxLines)
    lines.forEach((l, i) => c.fillText(l, x, y + i * lineHeight, maxWidth))
    return lines.length
  }
  function updateWinnerWall() {
    winners.forEach(({ rank, plaque }) => {
      const winner = winnerFor(rank), revealed = state.revealed >= 4 - rank
      const canvas = document.createElement('canvas'); canvas.width = 900; canvas.height = 220
      const c = canvas.getContext('2d')
      c.fillStyle = revealed ? '#1b2a20' : '#141b1a'; c.fillRect(0, 0, 900, 220)
      c.strokeStyle = revealed ? ACCENT : '#4e5e55'; c.lineWidth = 5; c.strokeRect(3, 3, 894, 214)
      const textX = revealed && winner ? 232 : 34
      if (revealed && winner) { c.fillStyle = '#0b1012'; c.fillRect(22, 22, 186, 176); drawFitted(c, ctx.sourceFor(winner), 26, 26, 178, 168) }
      c.fillStyle = ACCENT; c.font = `700 30px ${FONT}`; c.fillText('0' + rank + ' / ' + RANK_LABEL[rank], textX, 64)
      c.fillStyle = revealed ? '#f5f9ef' : '#a3b8a5'; c.font = `700 42px ${FONT}`
      c.fillText(revealed ? winner?.title || 'AWAITING RESULTS' : 'SEALED UNTIL THE CEREMONY', textX, 132, 870 - textX)
      c.fillStyle = '#a8c19e'; c.font = `400 26px ${FONT}`
      c.fillText(revealed && winner ? 'BY ' + String(winner.author || '').toUpperCase() : '11 OCTOBER 2026', textX, 182, 870 - textX)
      const t = new THREE.CanvasTexture(canvas); t.colorSpace = THREE.SRGBColorSpace
      plaque.material.map?.dispose(); plaque.material.map = t; plaque.material.needsUpdate = true
    })
  }
  function drawScreen(view = { kind: 'title' }) {
    state.view = view
    if (view.item) ctx.ensureLoaded(view.item)
    const W = 1400, Hh = 500, canvas = document.createElement('canvas'); canvas.width = W; canvas.height = Hh
    const c = canvas.getContext('2d')
    c.fillStyle = '#080d10'; c.fillRect(0, 0, W, Hh)
    const g = c.createLinearGradient(0, 0, W, Hh)
    g.addColorStop(0, view.kind === 'winner' ? '#2c3d1f' : '#1d2a25'); g.addColorStop(1, '#0d1417')
    c.fillStyle = g; c.fillRect(14, 14, W - 28, Hh - 28)
    c.strokeStyle = 'rgba(216,255,105,.35)'; c.lineWidth = 2; c.strokeRect(30, 30, W - 60, Hh - 60)
    const ink = '#f3f8f1', mute = '#a9bab2'
    if (view.kind === 'art' || view.kind === 'winner') {
      const item = view.item
      if (item) { c.fillStyle = '#05080a'; c.fillRect(50, 46, 600, 408); drawFitted(c, ctx.sourceFor(item), 56, 52, 588, 396) }
      c.fillStyle = ACCENT; c.font = `700 26px ${FONT}`
      c.fillText(view.kind === 'winner' ? '0' + view.rank + '  /  ' + RANK_LABEL[view.rank] : (item?.placeholder ? 'SAMPLE SHOWREEL  /  ' : 'FEATURED WORK  /  ') + String(view.index + 1).padStart(2, '0'), 700, 104)
      c.fillStyle = ink; c.font = `700 ${view.kind === 'winner' ? 72 : 62}px ${FONT}`
      const lines = wrapText(c, item ? item.title : 'AWAITING RESULTS', 700, 196, 640, 78, 3)
      c.fillStyle = mute; c.font = `400 32px ${FONT}`
      c.fillText(item ? 'BY ' + String(item.author || 'Unknown artist').toUpperCase() : 'THE JURY HAS NOT PUBLISHED THIS PLACE YET', 700, 196 + lines * 78 + 20, 640)
      if (view.kind === 'winner') { c.fillStyle = ACCENT; c.fillRect(700, 418, 140, 8) }
    } else {
      c.textAlign = 'center'
      const kicker = view.kind === 'tease' ? 'THE JURY HAS DECIDED' : 'AGENTIC AI  /  HACKATHON 2026'
      const title = view.kind === 'tease' ? 'AND ' + RANK_LABEL[view.rank] + '…' : view.kind === 'finale' ? 'CONGRATULATIONS' : 'THE CLOSING CEREMONY'
      const sub = view.kind === 'tease' ? 'GOES TO' : view.kind === 'finale' ? 'TO EVERY MAKER IN THIS ROOM  ·  SEE THE WINNERS WALL' : state.active ? 'PLEASE TAKE YOUR PLACES  ·  THE SHOW IS STARTING' : '11 OCTOBER 2026  ·  WELCOME TO THE HALL'
      c.fillStyle = ACCENT; c.font = `700 30px ${FONT}`; c.fillText(kicker, W / 2, 158)
      c.fillStyle = ink; c.font = `700 ${view.kind === 'tease' ? 88 : 84}px ${FONT}`; c.fillText(title, W / 2, 268, W - 140)
      c.fillStyle = mute; c.font = `400 30px ${FONT}`; c.fillText(sub, W / 2, 345, W - 160)
    }
    const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace
    screen.material.map?.dispose(); screen.material.map = texture; screen.material.needsUpdate = true
  }
  function burst(count, originX = 0) {
    let n = 0
    for (const p of confetti) {
      if (p.live) continue
      Object.assign(p, { live: true, x: originX + (Math.random() - .5) * 3, y: 4.3, z: -13.5 + Math.random() * 2.5, vx: (Math.random() - .5) * 6.5, vy: 1.5 + Math.random() * 3.2, vz: 1.2 + Math.random() * 3.8 })
      if (++n >= count) break
    }
  }
  function buildTimeline() {
    const steps = [{ kind: 'title', duration: 3.2, label: 'THE SHOW IS STARTING' }]
    showreel().slice(0, 4).forEach((item, index) => steps.push({ kind: 'art', item, index, duration: 3.6, label: 'CELEBRATING OUR MAKERS' }))
    for (const rank of [3, 2, 1]) {
      steps.push({ kind: 'tease', rank, duration: 2.4, label: 'AND ' + RANK_LABEL[rank] + ' GOES TO…' })
      steps.push({ kind: 'winner', rank, item: winnerFor(rank) || null, duration: 5, label: RANK_LABEL[rank] })
    }
    steps.push({ kind: 'finale', duration: Infinity, label: 'CONGRATULATIONS, MAKERS' })
    let at = 0
    for (const step of steps) { step.at = at; at += step.duration }
    return steps
  }
  function enterStep(index) {
    const step = state.timeline[index]; state.step = index
    if (step.kind === 'winner') { state.revealed = 4 - step.rank; updateWinnerWall(); burst(step.rank === 1 ? 260 : 130, PODIUM_X[step.rank]) }
    if (step.kind === 'finale') burst(220)
    drawScreen(step)
    callbacks.onCeremonyStage?.({ kind: step.kind, label: step.label, rank: step.rank || 0, index, total: state.timeline.length })
  }
  const tmp = new THREE.Vector3()
  const director = {
    get active() { return state.active },
    start() { Object.assign(state, { active: true, elapsed: 0, revealed: 0, step: -1, timeline: buildTimeline() }); updateWinnerWall(); callbacks.onCeremony?.(true) },
    end() { if (!state.active) return; Object.assign(state, { active: false, revealed: 0, step: -1 }); updateWinnerWall(); drawScreen({ kind: 'title' }); callbacks.onCeremony?.(false) },
    refresh() { updateWinnerWall(); if (!state.active) drawScreen({ kind: 'title' }) },
    redrawIf(id) { if (state.view?.item?.id === id) drawScreen(state.view); if (art().some((a) => a.id === id && a.winner_rank)) updateWinnerWall() },
    update(dt, realDt, time, inZone) {
      state.dim += ((state.active ? 1 : 0) - state.dim) * (1 - Math.exp(-2.2 * dt))
      const d = state.dim, b = globals.base
      globals.ambient.intensity = b.ambient * (1 - d * .8)
      globals.hemisphere.intensity = b.hemisphere * (1 - d * .72)
      fill.intensity = 30 * (1 - d * .82)
      const step = state.active ? state.timeline[state.step] : null
      spots.forEach((spot, i) => {
        spot.intensity = 26 + d * 44
        const sweep = Math.sin(state.elapsed * .9 + i * 2.1) * 5.5
        const aimX = step?.kind === 'winner' ? PODIUM_X[step.rank] : step?.kind === 'tease' || step?.kind === 'finale' ? Math.sin(state.elapsed * 2.2 + i * Math.PI) * 3 : step ? sweep : Math.sin(time * .25 + i) * 1.2
        const aimZ = step?.kind === 'winner' ? -11.2 : -13
        spot.target.position.x += (aimX - spot.target.position.x) * (1 - Math.exp(-3.2 * dt))
        spot.target.position.z += (aimZ - spot.target.position.z) * (1 - Math.exp(-3.2 * dt))
        const beam = spot.userData.beam
        tmp.subVectors(spot.target.position, spot.position)
        const length = tmp.length() * .92
        beam.position.copy(spot.position).addScaledVector(tmp, .46)
        beam.quaternion.setFromUnitVectors(UP, tmp.normalize().negate())
        beam.scale.set(Math.tan(spot.angle) * length / 1.25, length, Math.tan(spot.angle) * length / 1.25)
        beam.material.uniforms.opacity.value = .035 + d * .16
      })
      if (state.active) {
        state.elapsed += realDt
        let next = state.step
        while (next + 1 < state.timeline.length && state.elapsed >= state.timeline[next + 1].at) next++
        if (next !== state.step) enterStep(next)
      } else if (inZone) {
        state.idle += realDt
        const reel = showreel(), slot = Math.floor(state.idle / 6) % (reel.length + 1)
        if (slot !== state.idleSlot) { state.idleSlot = slot; drawScreen(slot === 0 ? { kind: 'title' } : { kind: 'art', item: reel[slot - 1], index: slot - 1 }) }
      }
      let live = false
      const pos = cg.attributes.position
      confetti.forEach((p, i) => {
        if (!p.live) return
        live = true
        p.vy -= 4.2 * dt; p.vx *= Math.exp(-1.6 * dt); p.vz *= Math.exp(-1.6 * dt)
        p.x += (p.vx + Math.sin(time * 7 + p.spin) * .5) * dt; p.y += Math.max(p.vy, -1.1) * dt; p.z += p.vz * dt
        if (p.y < .05) { p.live = false; p.y = -20 }
        pos.setXYZ(i, p.x, p.y, p.z)
      })
      if (live || state.confettiLive) pos.needsUpdate = true
      state.confettiLive = live
    },
  }
  drawScreen({ kind: 'title' }); updateWinnerWall()
  const zone = {
    id: 'ceremony', name: 'Rooftop Stage', group, hue: '#ffc95c', kind: 'roof', floor: 1, bulbs,
    spawn: { x: 0, z: -1.2, yaw: 0, pitch: .08 }, portraitSpawn: { x: 0, z: .4, yaw: 0, pitch: .1 },
    bounds: { minX: -11, maxX: 11, minZ: -16, maxZ: 0 },
    origin: ctx.origin,
    // Zone tests take world coordinates; the hall is laid out in local ones.
    collide(x, z) { x -= ctx.origin.x; z -= ctx.origin.z; return Math.abs(x) > 12.3 || z > 1.3 || z < -17.3 || (z < -10.4 && Math.abs(x) < 8.3) || (z < -15 && Math.abs(x - 8.55) < 2.4) || (z < -3.9 && z > -9.4 && Math.abs(x) > 1.05 && Math.abs(x) < 6.1) },
    exitAt() { return null },
    update(time) {
      bulbs.forEach((b, i) => { b.scale.setScalar(.85 + .25 * Math.sin(time * 2.2 + i * 1.3)) })
      beacons.forEach((b, i) => { b.visible = Math.sin(time * 2 + i) > .2 })
      stripMat.color.setRGB(1.4, 1.1, .5).multiplyScalar(.75 + .25 * Math.sin(time * 1.3))
      spill.material.opacity = .16 + .08 * Math.sin(time * .9)
    },
  }
  zone.portalMeshes = []
  return { zone, director }
}
