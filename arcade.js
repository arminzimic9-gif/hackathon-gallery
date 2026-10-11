import * as THREE from 'three'
import { createFloaters } from './fx.js'
import { FONT, textTexture, radialGlow } from './art.js'

// Neon tube lettering: a white-hot core inside a coloured bloom.
function neonTexture(text, color, w = 1024, h = 220, size = 120) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d')
  g.font = `700 ${size}px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'
  for (const [blur, col, lw] of [[40, color, 10], [18, color, 7], [4, '#ffffff', 3]]) { g.shadowBlur = blur; g.shadowColor = color; g.strokeStyle = col; g.lineWidth = lw; g.strokeText(text, w / 2, h / 2) }
  g.shadowBlur = 0; g.fillStyle = 'rgba(255,255,255,.9)'; g.fillText(text, w / 2, h / 2)
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t
}

export const GAMES = [
  { id: 'memory', name: 'MEMORY MATCH', hue: '#ff4fd8', blurb: 'Pair the gallery’s real artworks' },
  { id: 'coins', name: 'COIN RUSH', hue: '#ffd23f', blurb: '45 seconds. Grab every coin on the floor' },
  { id: 'memes', name: 'MEME HUNT', hue: '#3ff2ff', blurb: 'Find all five hidden memes against the clock' },
]

// CRT glass: a canvas feed with scanlines, a slight barrel vignette and flicker.
export function crtMaterial(texture, tint = '#ffffff') {
  return new THREE.ShaderMaterial({
    uniforms: { map: { value: texture }, uTime: { value: 0 }, uTint: { value: new THREE.Color(tint) }, uHover: { value: 0 }, uOn: { value: 1 } },
    vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `uniform sampler2D map; uniform float uTime, uHover, uOn; uniform vec3 uTint; varying vec2 vUv;
      void main() { vec2 c = vUv - .5; vec2 uv = .5 + c * (1.0 + dot(c, c) * .18);
        if (uv.x < 0.0 || uv.y < 0.0 || uv.x > 1.0 || uv.y > 1.0) { gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0); return; }
        vec3 col = texture2D(map, uv).rgb;
        float scan = .78 + .22 * sin(uv.y * 520.0 + uTime * 6.0);
        float vig = smoothstep(.85, .25, length(c) * 1.3);
        float flick = .94 + .06 * sin(uTime * 37.0);
        gl_FragColor = vec4(col * uTint * scan * vig * flick * (1.05 + uHover * .5) * uOn, 1.0); }`,
    toneMapped: false,
  })
}

// Underground arcade (floor B1). Hall-local coordinates: lift wall at z=0,
// cabinets against the back wall near z=-16, x spans ±12.
export function buildArcade(ctx) {
  const { box, mats, quality } = ctx
  const group = new THREE.Group(); group.position.copy(ctx.origin)
  const H = 5.2
  box(0, -.18, -9, 24, .36, 18, mats.floor, group)
  box(0, H + .18, -9, 24, .34, 18, mats.ceiling, group)
  box(-12, H / 2, -9, .36, H, 18, mats.wall, group)
  box(12, H / 2, -9, .36, H, 18, mats.wall, group)
  box(0, H / 2, -18, 24, H, .38, mats.wall, group)
  box(0, H / 2, 0, 24, H, .38, mats.wall, group)
  const pink = new THREE.MeshBasicMaterial({ color: new THREE.Color('#ff4fd8').multiplyScalar(1.6), toneMapped: false })
  const cyan = new THREE.MeshBasicMaterial({ color: new THREE.Color('#3ff2ff').multiplyScalar(1.6), toneMapped: false })
  // Neon floor grid and wall strips.
  for (let x = -10; x <= 10; x += 2.5) box(x, .01, -9, .03, .01, 17.6, x % 5 === 0 ? pink : mats.frameEdge, group)
  for (let z = -1.5; z > -17.6; z -= 2.5) box(0, .01, z, 23.6, .01, .03, cyan, group)
  for (const side of [-1, 1]) { box(side * 11.8, H - .25, -9, .05, .06, 17.6, side < 0 ? pink : cyan, group); box(side * 11.8, .25, -9, .05, .06, 17.6, side < 0 ? cyan : pink, group) }
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(9, 1.3), new THREE.MeshBasicMaterial({ map: textTexture('UNDERGROUND ARCADE', { width: 2048, height: 300, size: 170, color: '#ffe8fb', tracking: 14 }), transparent: true, toneMapped: false, depthWrite: false }))
  sign.position.set(0, 4.35, -17.78); group.add(sign)
  const signGlow = new THREE.PointLight(0xff4fd8, 9, 9, 1.6); signGlow.position.set(0, 4, -16.5); group.add(signGlow)

  // Cabinets with live attract-mode screens, marquees and controls.
  const cabinets = GAMES.map((game, i) => {
    const holder = new THREE.Group(); holder.position.set((i - 1) * 4.8, 0, -15.1); holder.scale.setScalar(1.35); group.add(holder)
    const body = new THREE.MeshStandardMaterial({ color: '#141821', roughness: .45, metalness: .3 })
    box(0, 1.1, 0, 1.6, 2.2, 1.1, body, holder)
    box(0, 2.45, -.12, 1.6, .6, .86, body, holder)
    const marquee = new THREE.Mesh(new THREE.PlaneGeometry(1.5, .46), new THREE.MeshBasicMaterial({ map: textTexture(game.name, { width: 640, height: 200, size: 74, color: '#ffffff', bg: game.hue, tracking: 4 }), toneMapped: false }))
    marquee.position.set(0, 2.47, .32); holder.add(marquee)
    const canvas = document.createElement('canvas'); canvas.width = 256; canvas.height = 192
    const tex = new THREE.CanvasTexture(canvas); tex.colorSpace = THREE.SRGBColorSpace; tex.minFilter = THREE.NearestFilter; tex.magFilter = THREE.NearestFilter
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(1.24, .94), crtMaterial(tex))
    screen.position.set(0, 1.72, .56); screen.rotation.x = -.22; holder.add(screen)
    box(0, 1.08, .62, 1.5, .1, .5, new THREE.MeshStandardMaterial({ color: '#232a36', roughness: .5 }), holder)
    const stick = box(-.35, 1.22, .66, .06, .2, .06, mats.trim, holder)
    const ball = new THREE.Mesh(new THREE.SphereGeometry(.07, 12, 8), new THREE.MeshStandardMaterial({ color: game.hue, emissive: game.hue, emissiveIntensity: .6 })); ball.position.set(-.35, 1.34, .66); holder.add(ball)
    const buttons = [0, 1, 2].map((k) => { const b = new THREE.Mesh(new THREE.CylinderGeometry(.055, .055, .04, 14), new THREE.MeshBasicMaterial({ color: new THREE.Color(k === 1 ? game.hue : '#f4f4f4').multiplyScalar(1.3), toneMapped: false })); b.position.set(.05 + k * .16, 1.15, .62 + (k % 2) * .06); holder.add(b); return b })
    for (const sx of [-.81, .81]) box(sx, 1.4, .05, .03, 2.8, 1.12, new THREE.MeshBasicMaterial({ color: new THREE.Color(game.hue).multiplyScalar(1.4), toneMapped: false }), holder)
    const glow = new THREE.PointLight(new THREE.Color(game.hue), 5, 5, 1.6); glow.position.set(0, 1.8, 1.4); holder.add(glow)
    const hit = new THREE.Mesh(new THREE.BoxGeometry(1.7, 2.8, 1.3), new THREE.MeshBasicMaterial({ visible: false }))
    hit.position.set(0, 1.4, .1); hit.userData = { kind: 'cabinet', id: game.id }; holder.add(hit)
    // Detail: screen bezel, glowing marquee backlight, speaker grille, coin door, side art.
    const bezel = new THREE.MeshStandardMaterial({ color: '#07090d', roughness: .3, metalness: .5 })
    for (const [w, h, x, y] of [[1.42, .08, 0, 2.23], [1.42, .08, 0, 1.22], [.08, 1.06, -.68, 1.72], [.08, 1.06, .68, 1.72]]) { const b = box(x, y, .58, w, h, .06, bezel, holder); b.rotation.x = -.22 }
    const back = new THREE.Mesh(new THREE.PlaneGeometry(1.7, .7), new THREE.MeshBasicMaterial({ map: radialGlow(), color: new THREE.Color(game.hue).multiplyScalar(1.6), transparent: true, opacity: .8, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }))
    back.position.set(0, 2.47, .31); holder.add(back)
    box(0, 2.78, .1, 1.62, .06, .9, new THREE.MeshBasicMaterial({ color: new THREE.Color(game.hue).multiplyScalar(1.5), toneMapped: false }), holder)
    const grille = new THREE.MeshStandardMaterial({ color: '#0b0e14', roughness: .7 })
    for (let k = 0; k < 5; k++) box(0, 2.08 + k * .035, .43, .9, .012, .02, grille, holder)
    box(0, .55, .56, .5, .42, .04, new THREE.MeshStandardMaterial({ color: '#1c222c', roughness: .4, metalness: .6 }), holder)
    for (const dx of [-.1, .1]) box(dx, .62, .585, .05, .12, .02, new THREE.MeshBasicMaterial({ color: new THREE.Color('#ff4a3a').multiplyScalar(1.6), toneMapped: false }), holder)
    const art = new THREE.MeshBasicMaterial({ color: new THREE.Color(game.hue).multiplyScalar(.9), toneMapped: false })
    for (const sx of [-.825, .825]) for (let k = 0; k < 3; k++) { const st = box(sx, .5 + k * .45, .1, .015, .06, .9, art, holder); st.rotation.x = .5 }
    return { game, holder, screen, canvas, tex, glow, buttons, stick, ball, hit, hover: 0, press: -9, back }
  })
  function drawAttract(cab, time) {
    const c = cab.canvas.getContext('2d'), W = 256, Hh = 192, t = time
    c.fillStyle = '#05060c'; c.fillRect(0, 0, W, Hh)
    c.fillStyle = cab.game.hue
    if (cab.game.id === 'memory') {
      for (let i = 0; i < 12; i++) { const x = 22 + (i % 4) * 54, y = 34 + Math.floor(i / 4) * 46, up = Math.sin(t * 2 + i * 1.7) > .55
        c.fillStyle = up ? ['#ff4fd8', '#ffd23f', '#3ff2ff', '#d8ff69'][i % 4] : '#2a1c3a'; c.fillRect(x, y, 44, 38) }
    } else if (cab.game.id === 'coins') {
      for (let i = 0; i < 9; i++) { const x = (i * 37 + t * 60) % 290 - 20, y = 60 + Math.sin(t * 3 + i) * 34 + (i % 3) * 22, w = 14 * Math.abs(Math.cos(t * 5 + i))
        c.fillStyle = '#ffd23f'; c.beginPath(); c.ellipse(x, y, Math.max(2, w), 14, 0, 0, Math.PI * 2); c.fill() }
    } else {
      const px = 128 + Math.sin(t * 1.3) * 80, py = 100 + Math.cos(t * .9) * 40
      c.fillStyle = '#3ff2ff'; c.beginPath(); c.arc(px, py, 26, 0, Math.PI * 2); c.lineWidth = 6; c.strokeStyle = '#3ff2ff'; c.stroke(); c.fillRect(px + 16, py + 16, 24, 8)
      c.fillStyle = '#ffffff'; c.font = `700 18px ${FONT}`; c.fillText('?', 40 + (t * 40) % 180, 50)
    }
    c.fillStyle = Math.sin(t * 4) > 0 ? '#ffffff' : '#888'; c.font = `700 18px ${FONT}`; c.textAlign = 'center'; c.fillText('TAP TO PLAY', W / 2, Hh - 14); c.textAlign = 'left'
    cab.tex.needsUpdate = true
  }
  // Neon signage on the back wall.
  const neon = (text, color, w, h, x, y, z, ry = 0) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: neonTexture(text, color), transparent: true, depthWrite: false, toneMapped: false, color: new THREE.Color(1.5, 1.5, 1.5) }))
    m.position.set(x, y, z); m.rotation.y = ry; group.add(m); return m
  }
  const gameOn = neon('GAME ON', '#3ff2ff', 3.4, .75, -8.4, 4.05, -17.76)
  const insertCoin = neon('INSERT COIN', '#ffd23f', 3.6, .78, 8.4, 4.05, -17.76)
  // Claw machine: glass cabinet, prize pile, a claw that drifts and dips.
  const claw = new THREE.Group(); claw.position.set(-8.8, 0, -14.6); group.add(claw)
  const clawFrame = new THREE.MeshStandardMaterial({ color: '#ff4fd8', roughness: .35, metalness: .4, emissive: '#5a0d4c', emissiveIntensity: .6 })
  box(0, .45, 0, 1.7, .9, 1.5, clawFrame, claw); box(0, 3, 0, 1.7, .3, 1.5, clawFrame, claw)
  for (const [x, zz] of [[-.82, -.72], [.82, -.72], [-.82, .72], [.82, .72]]) box(x, 1.95, zz, .06, 1.8, .06, clawFrame, claw)
  const glass = new THREE.MeshPhysicalMaterial({ color: '#cfefff', roughness: .05, transparent: true, opacity: .14, depthWrite: false })
  box(0, 1.95, .74, 1.6, 1.8, .02, glass, claw); box(-.84, 1.95, 0, .02, 1.8, 1.4, glass, claw); box(.84, 1.95, 0, .02, 1.8, 1.4, glass, claw)
  const prizeCols = ['#ffd23f', '#3ff2ff', '#ff4fd8', '#d8ff69', '#ff7a5c', '#a98bff']
  for (let k = 0; k < 26; k++) { const p = new THREE.Mesh(new THREE.SphereGeometry(.13 + (k % 3) * .02, 10, 8), new THREE.MeshStandardMaterial({ color: prizeCols[k % 6], roughness: .4, emissive: prizeCols[k % 6], emissiveIntensity: .25 })); p.position.set(-.6 + (k % 6) * .24, 1.02 + Math.floor(k / 6) * .14, -.5 + ((k * 7) % 5) * .24); claw.add(p) }
  const clawHead = new THREE.Group(); claw.add(clawHead)
  box(0, 0, 0, .04, .7, .04, mats.trim, clawHead)
  for (let k = 0; k < 3; k++) { const f = box(0, -.42, 0, .03, .22, .03, new THREE.MeshStandardMaterial({ color: '#d9e2ea', metalness: .9, roughness: .2 }), clawHead); f.rotation.z = .5; f.rotation.y = k * 2.09; f.position.set(Math.sin(k * 2.09) * .06, -.42, Math.cos(k * 2.09) * .06) }
  const clawSign = new THREE.Mesh(new THREE.PlaneGeometry(1.5, .26), new THREE.MeshBasicMaterial({ map: textTexture('PRIZE CLAW', { width: 512, height: 90, size: 54, color: '#ffffff', bg: '#ff4fd8' }), toneMapped: false }))
  clawSign.position.set(0, 3, .76); claw.add(clawSign)
  const clawLight = new THREE.PointLight(0xff4fd8, 4, 4, 1.6); clawLight.position.set(0, 2.6, 0); claw.add(clawLight)
  // Bean bags facing the meme wall.
  const beanCols = ['#3ff2ff', '#ff4fd8', '#ffd23f']
  const beans = [[-8.6, -5.4], [-8.9, -8.2], [-8.4, -11]].map(([x, z], k) => {
    const b = new THREE.Mesh(new THREE.SphereGeometry(.62, 18, 12), new THREE.MeshStandardMaterial({ color: beanCols[k], roughness: .85 }))
    b.scale.set(1, .52, 1.08); b.position.set(x, .32, z); group.add(b); return b
  })

  // Meme wall: a bank of CRT monitors fed by the gallery's meme-room art.
  const monitors = []
  for (let i = 0; i < 6; i++) {
    const z = -3.6 - (i % 3) * 4.3, y = i < 3 ? 1.6 : 3.4
    box(-11.55, y, z, .5, 1.5, 2.1, new THREE.MeshStandardMaterial({ color: '#0d1016', roughness: .5 }), group)
    const tex = new THREE.CanvasTexture(document.createElement('canvas')); tex.colorSpace = THREE.SRGBColorSpace
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 1.24), crtMaterial(tex, i % 2 ? '#ffd8f6' : '#d8fbff'))
    screen.position.set(-11.29, y, z); screen.rotation.y = Math.PI / 2; group.add(screen)
    monitors.push({ screen, tex, index: i })
  }
  const memeSign = new THREE.Mesh(new THREE.PlaneGeometry(4, .5), new THREE.MeshBasicMaterial({ map: textTexture('MEME WALL', { width: 1024, height: 128, size: 80, color: '#ff4fd8', tracking: 14 }), transparent: true, toneMapped: false, depthWrite: false }))
  memeSign.position.set(-11.75, 4.7, -7.9); memeSign.rotation.y = Math.PI / 2; group.add(memeSign)
  // High-score board on the right wall.
  const boardCanvas = document.createElement('canvas'); boardCanvas.width = 1024; boardCanvas.height = 640
  const boardTex = new THREE.CanvasTexture(boardCanvas); boardTex.colorSpace = THREE.SRGBColorSpace
  const board = new THREE.Mesh(new THREE.PlaneGeometry(6, 3.75), crtMaterial(boardTex, '#e6fbff'))
  board.position.set(11.78, 2.7, -9); board.rotation.y = -Math.PI / 2; group.add(board)
  function drawBoard(scores = {}) {
    const c = boardCanvas.getContext('2d')
    c.fillStyle = '#04060d'; c.fillRect(0, 0, 1024, 640)
    c.fillStyle = '#3ff2ff'; c.font = `700 56px ${FONT}`; c.textAlign = 'center'; c.fillText('HIGH SCORES', 512, 78)
    GAMES.forEach((g, i) => {
      const x = 30 + i * 330
      c.textAlign = 'left'; c.fillStyle = g.hue; c.font = `700 30px ${FONT}`; c.fillText(g.name, x, 150)
      const list = (scores[g.id] || []).slice(0, 7)
      if (!list.length) { c.fillStyle = '#5c6a80'; c.font = `400 26px ${FONT}`; c.fillText('Be the first', x, 200) }
      list.forEach((s, k) => { c.fillStyle = k ? '#d6e2f2' : '#ffffff'; c.font = `${k ? 400 : 700} 27px ${FONT}`; c.fillText(String(k + 1).padStart(2, '0') + '  ' + s.name.slice(0, 10), x, 200 + k * 58); c.textAlign = 'right'; c.fillText(String(s.display || s.score), x + 300, 200 + k * 58); c.textAlign = 'left' })
    })
    boardTex.needsUpdate = true
  }
  drawBoard()
  const lights = []
  for (const [x, z, c] of [[-7, -5, 0xff4fd8], [7, -5, 0x3ff2ff], [-7, -13, 0x3ff2ff], [7, -13, 0xff4fd8]]) { const l = new THREE.PointLight(c, 10, 11, 1.6); l.position.set(x, 4.4, z); group.add(l); lights.push(l) }
  const haze = createFloaters({ count: [40, 70, 110][quality], size: .09, colors: ['#ff4fd8', '#3ff2ff', '#ffd23f'], height: [.3, 4.8], speed: .2, opacity: .6, area: () => ({ x: (Math.random() - .5) * 22, z: -1 - Math.random() * 16 }) })
  haze.userData.lowHide = true; group.add(haze)
  let frame = 0
  const zone = {
    id: 'arcade', name: 'Underground Arcade', kind: 'arcade', floor: -1, hue: '#ff4fd8', group, origin: ctx.origin,
    cabinets, monitors, portalMeshes: cabinets.map((c) => c.hit), floaters: [haze],
    spawn: { x: 0, z: -2.6, yaw: 0, pitch: .02 }, portraitSpawn: { x: 0, z: -1.6, yaw: 0, pitch: .02 },
    collide(x, z) { x -= ctx.origin.x; z -= ctx.origin.z; return Math.abs(x) > 11.2 || z > -.7 || z < -17.3 || (z < -13.8 && cabinets.some((c) => Math.abs(x - c.holder.position.x) < 1.6)) || (Math.abs(x + 8.8) < 1.3 && z < -13.5) || beans.some((b) => Math.hypot(x - b.position.x, z - b.position.z) < .9) },
    exitAt() { return null },
    drawBoard,
    setMemes(sources) { monitors.forEach((m) => { const src = sources[m.index % Math.max(1, sources.length)]; if (!src) return; m.tex.image = src; m.tex.needsUpdate = true }) },
    update(time, dt) {
      frame++
      clawHead.position.set(Math.sin(time * .6) * .5, 2.6 - Math.max(0, Math.sin(time * .9)) * .9, Math.cos(time * .45) * .4)
      insertCoin.material.opacity = Math.sin(time * 9) > -.85 ? (Math.sin(time * 2.2) > 0 ? 1 : .55) : .15
      gameOn.material.opacity = .85 + Math.sin(time * 3.1) * .15
      cabinets.forEach((cab, i) => {
        if ((frame + i * 3) % 6 === 0) drawAttract(cab, time)
        cab.screen.material.uniforms.uTime.value = time
        cab.screen.material.uniforms.uHover.value += (cab.hover - cab.screen.material.uniforms.uHover.value) * (1 - Math.exp(-8 * dt))
        const h = cab.screen.material.uniforms.uHover.value
        cab.holder.rotation.y = Math.sin(time * .5 + i) * .01 + h * .03
        cab.glow.intensity = 4 + Math.sin(time * 2 + i) * 1 + h * 6
        cab.back.material.opacity = .65 + Math.sin(time * 1.7 + i) * .15 + h * .3
        const p = Math.max(0, 1 - (time - cab.press) * 4)
        cab.buttons.forEach((b, k) => { b.position.y = 1.15 - (k === 1 ? p * .03 : 0) })
        cab.stick.rotation.z = Math.sin(time * 3 + i) * .15 * (1 + h * 2); cab.ball.position.x = -.35 - cab.stick.rotation.z * .14
      })
      monitors.forEach((m) => { m.screen.material.uniforms.uTime.value = time })
      board.material.uniforms.uTime.value = time
      lights.forEach((l, i) => { l.intensity = 9 + Math.sin(time * 1.4 + i * 1.7) * 2.5 })
      haze.material.uniforms.uTime.value = time
    },
  }
  return zone
}
