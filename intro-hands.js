import * as THREE from 'three'
import { MarchingCubes } from 'three/addons/objects/MarchingCubes.js'
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js'

// 'Creation of Adam' for Agentic AI: a softly lit human hand and a wireframe
// orange AI hand reach across a particle field; when the fingertips touch, a
// burst of light opens into the gallery. Everything here is procedural.
const ORANGE = new THREE.Color('#ff7a2f')
const APPROACH = 4.6, BURST = 2.0, DURATION = 7.0
const expoOut = (t) => t >= 1 ? 1 : 1 - Math.pow(2, -10 * t)
const quartOut = (t) => 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 4)

// Hand model in its own frame: fingers extend along +x, palm faces -y, thumb on +z.
const FINGERS = [
  { z: .27, len: [.43, .27, .2], r: .088 },
  { z: .09, len: [.47, .3, .21], r: .094 },
  { z: -.095, len: [.44, .28, .2], r: .089 },
  { z: -.27, len: [.34, .22, .18], r: .078 },
]
// The skeleton as tapered segments (bones) plus the index fingertip.
function skeleton({ curls, thumbCurl, spread = .06 }) {
  const bones = [], tip = new THREE.Vector3(), a = new THREE.Vector3(), b = new THREE.Vector3()
  const seg = (chain, len, r0, r1) => { a.setFromMatrixPosition(chain); chain.multiply(new THREE.Matrix4().makeTranslation(len, 0, 0)); b.setFromMatrixPosition(chain); bones.push({ a: a.clone(), b: b.clone(), r0, r1 }) }
  FINGERS.forEach((f, fi) => {
    const chain = new THREE.Matrix4().makeTranslation(.42 - Math.abs(f.z - .08) * .2, -.015, f.z)
    chain.multiply(new THREE.Matrix4().makeRotationY((fi - 1.4) * -spread))
    f.len.forEach((len, k) => {
      chain.multiply(new THREE.Matrix4().makeRotationZ(-curls[fi][k]))
      const r = f.r * Math.pow(.9, k)
      seg(chain, len, r, r * (k === 2 ? .82 : .93))
    })
    if (fi === 0) tip.setFromMatrixPosition(chain)
  })
  const thumb = new THREE.Matrix4().makeTranslation(-.05, -.07, .3)
  thumb.multiply(new THREE.Matrix4().makeRotationY(-.8)).multiply(new THREE.Matrix4().makeRotationX(-.55))
  ;[.34, .25, .19].forEach((len, k) => { thumb.multiply(new THREE.Matrix4().makeRotationZ(-thumbCurl[k])); const r = .118 * Math.pow(.86, k); seg(thumb, len, r, r * .9) })
  // Palm as a soft slab of bones, then a wrist that tapers into darkness.
  for (const z of [-.24, -.08, .08, .24]) bones.push({ a: new THREE.Vector3(-.3, 0, z * .92), b: new THREE.Vector3(.38 - Math.abs(z - .05) * .25, -.01, z), r0: .15, r1: .13 })
  bones.push({ a: new THREE.Vector3(-1.5, .02, 0), b: new THREE.Vector3(-.28, 0, 0), r0: .25, r1: .22 })
  return { bones, tip }
}
// Fuse the bones into one organic surface with marching cubes, then copy the
// result into a static geometry (the polygoniser runs once, at load).
function fuse(bones, resolution) {
  const mc = new MarchingCubes(resolution, new THREE.MeshBasicMaterial(), false, false, 120000)
  mc.isolation = 80
  const S = 3.4, cx = -.1, cy = -.12, sub = 12, p = new THREE.Vector3()
  mc.reset()
  for (const bone of bones) {
    const len = bone.a.distanceTo(bone.b), n = Math.max(2, Math.ceil(len / (Math.min(bone.r0, bone.r1) * .45)))
    for (let i = 0; i <= n; i++) {
      const t = i / n, r = bone.r0 + (bone.r1 - bone.r0) * t
      p.lerpVectors(bone.a, bone.b, t)
      const rn = r / S
      mc.addBall((p.x - cx) / S + .5, (p.y - cy) / S + .5, p.z / S + .5, (80 + sub) * rn * rn * .42, sub)
    }
  }
  mc.update()
  const count = mc.count, geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(mc.positionArray.slice(0, count * 3), 3))
  geometry.setAttribute('normal', new THREE.BufferAttribute(mc.normalArray.slice(0, count * 3), 3))
  // Marching-cubes space is [-1, 1]; map back to hand units.
  geometry.scale(S / 2, S / 2, S / 2); geometry.translate(cx, cy, 0)
  mc.geometry.dispose(); mc.material.dispose()
  return geometry
}
function buildHand(pose, resolution) {
  const { bones, tip } = skeleton(pose)
  return { geometry: fuse(bones, resolution), tip }
}

export function createHandsIntro({ quality = 1 } = {}) {
  const scene = new THREE.Scene()
  scene.background = new THREE.Color('#04070a')
  scene.fog = new THREE.FogExp2('#04070a', .05)
  const camera = new THREE.PerspectiveCamera(38, 1, .05, 80)
  const touch = new THREE.Vector3(.25, .15, 0)

  // Human hand (left, reaching right): relaxed, index gently drooping (Adam).
  const human = buildHand({ curls: [[.12, .16, .14], [.55, .7, .45], [.7, .8, .5], [.85, .9, .5]], thumbCurl: [.15, .25, .2] }, [72, 92, 110][quality])
  const skin = new THREE.MeshPhysicalMaterial({ color: '#cf9c80', roughness: .5, metalness: 0, sheen: 1, sheenColor: new THREE.Color('#ff9f7e'), sheenRoughness: .55, clearcoat: .12, clearcoatRoughness: .6, emissive: '#2a120a', emissiveIntensity: .25 })
  const humanMesh = new THREE.Mesh(human.geometry, skin)
  const humanGroup = new THREE.Group(); humanGroup.add(humanMesh)
  humanMesh.rotation.set(.42, .12, -.1)
  scene.add(humanGroup)

  // AI hand (right, reaching left): mirrored, index straight and assertive.
  const ai = buildHand({ curls: [[.02, .04, .03], [.45, .55, .35], [.6, .7, .4], [.75, .85, .45]], thumbCurl: [.25, .3, .2] }, [34, 40, 46][quality])
  // Weld the coarse surface so the wireframe reads as a clean triangulated lattice.
  ai.geometry = mergeVertices(ai.geometry, 1e-4)
  const aiGroup = new THREE.Group()
  const aiRoot = new THREE.Group(); aiRoot.scale.x = -1; aiRoot.rotation.set(-.32, 0, .08); aiGroup.add(aiRoot)
  const wire = new THREE.LineSegments(new THREE.WireframeGeometry(ai.geometry), new THREE.LineBasicMaterial({ color: ORANGE.clone().multiplyScalar(1.7), transparent: true, opacity: .55, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }))
  const shell = new THREE.Mesh(ai.geometry, new THREE.MeshBasicMaterial({ color: ORANGE.clone().multiplyScalar(.5), transparent: true, opacity: .07, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }))
  const nodeGeo = new THREE.BufferGeometry(); nodeGeo.setAttribute('position', ai.geometry.getAttribute('position'))
  const nodes = new THREE.Points(nodeGeo, new THREE.PointsMaterial({ color: ORANGE.clone().multiplyScalar(2.2), size: .028, transparent: true, opacity: .8, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }))
  aiRoot.add(shell, wire, nodes)
  scene.add(aiGroup)

  // Fingertip offsets after each hand's own rotation, used to meet exactly at `touch`.
  const humanTip = human.tip.clone().applyEuler(humanMesh.rotation)
  const aiTip = ai.tip.clone().multiply(aiRoot.scale).applyEuler(aiRoot.rotation)

  const key = new THREE.DirectionalLight(0xffe6d2, 2.4); key.position.set(-3, 4, 3)
  const rim = new THREE.DirectionalLight(0x8fb6ff, 2.2); rim.position.set(-1, 1, -4)
  const fromAI = new THREE.PointLight(ORANGE, 0, 3.5, 1.6); fromAI.position.copy(touch)
  scene.add(key, rim, fromAI, new THREE.AmbientLight(0x1a2230, .6))

  // Particle space; the burst pushes every particle away from the touch point.
  const count = [1500, 3200, 5200][quality]
  const pg = new THREE.BufferGeometry(), pos = new Float32Array(count * 3), seeds = new Float32Array(count), cols = new Float32Array(count * 3)
  const pal = [new THREE.Color('#ffffff'), new THREE.Color('#ffb27a'), new THREE.Color('#9fc2ff'), new THREE.Color('#d8ff69')]
  for (let i = 0; i < count; i++) {
    const r = 1.5 + Math.pow(Math.random(), .6) * 16, a = Math.random() * Math.PI * 2, y = (Math.random() - .5) * 2
    pos.set([Math.cos(a) * r * Math.sqrt(1 - y * y), y * r * .55, Math.sin(a) * r * Math.sqrt(1 - y * y) - 4], i * 3)
    seeds[i] = Math.random(); const c = pal[i % 7 === 0 ? 1 : i % 11 === 0 ? 3 : i % 3 === 0 ? 2 : 0]; cols.set([c.r, c.g, c.b], i * 3)
  }
  pg.setAttribute('position', new THREE.BufferAttribute(pos, 3)); pg.setAttribute('seed', new THREE.BufferAttribute(seeds, 1)); pg.setAttribute('color', new THREE.BufferAttribute(cols, 3))
  const particleMat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uBurst: { value: 0 }, uOrigin: { value: touch }, uScale: { value: 300 } },
    vertexShader: `attribute float seed; attribute vec3 color; uniform float uTime, uBurst, uScale; uniform vec3 uOrigin; varying vec3 vC; varying float vA;
      void main() { vec3 p = position; float t = uTime * (.05 + seed * .08);
        p.xz = mat2(cos(t), -sin(t), sin(t), cos(t)) * p.xz; p.y += sin(uTime * .3 + seed * 30.0) * .15;
        vec3 dir = normalize(p - uOrigin + 1e-3); p += dir * uBurst * uBurst * (6.0 + seed * 10.0);
        vec4 mv = modelViewMatrix * vec4(p, 1.0); vC = color; vA = .35 + .65 * fract(seed * 13.7 + uTime * .1 * seed);
        gl_PointSize = (1.0 + seed * 2.2) * (1.0 + uBurst * 2.0) * uScale / -mv.z * .02; gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `varying vec3 vC; varying float vA; void main() { float r = length(gl_PointCoord - .5); float a = smoothstep(.5, 0.0, r);
      gl_FragColor = vec4(vC * 1.4, a * vA); }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false,
  })
  const particles = new THREE.Points(pg, particleMat); particles.frustumCulled = false; scene.add(particles)

  // The spark between fingertips and the burst flare.
  const flareTex = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d')
    const grad = g.createRadialGradient(128, 128, 0, 128, 128, 128)
    grad.addColorStop(0, 'rgba(255,255,255,1)'); grad.addColorStop(.18, 'rgba(255,236,200,.85)'); grad.addColorStop(.45, 'rgba(255,150,80,.25)'); grad.addColorStop(1, 'rgba(255,120,40,0)')
    g.fillStyle = grad; g.fillRect(0, 0, 256, 256); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t
  })()
  const spark = new THREE.Sprite(new THREE.SpriteMaterial({ map: flareTex, color: new THREE.Color(2, 1.8, 1.6), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }))
  spark.position.copy(touch); scene.add(spark)
  const ring = new THREE.Mesh(new THREE.RingGeometry(.96, 1, 96), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 2.1, 1.6), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, side: THREE.DoubleSide }))
  ring.position.copy(touch); scene.add(ring)

  let aspect = 16 / 9
  const humanBase = touch.clone().sub(humanTip), aiBase = touch.clone().sub(aiTip)
  const humanDir = new THREE.Vector3(1, -.08, .1).normalize(), aiDir = new THREE.Vector3(-1, .12, -.05).normalize()
  const result = { phase: 'approach', burst: 0, touched: false }
  return {
    scene, camera, duration: DURATION,
    setSize(w, h) { aspect = w / Math.max(1, h); camera.aspect = aspect; camera.updateProjectionMatrix() },
    update(t) {
      const a = Math.min(1, t / APPROACH), reach = expoOut(a * .92 + .08 * a * a)
      const gap = (1 - reach) * 2.6 + (t < APPROACH ? .0 : 0)
      const breathe = Math.sin(t * 1.3) * .015
      humanGroup.position.copy(humanBase).addScaledVector(humanDir, -gap).add(new THREE.Vector3(0, breathe, 0))
      aiGroup.position.copy(aiBase).addScaledVector(aiDir, -gap).add(new THREE.Vector3(0, -breathe * .8, 0))
      humanMesh.rotation.z = -.1 + Math.sin(t * .9) * .015 * (1 - reach)
      const portrait = aspect < .9
      const dist = (portrait ? 9.2 : 4.6) - quartOut(t / DURATION) * (portrait ? 1.4 : .8)
      camera.position.set(touch.x + .1 + Math.sin(t * .4) * .08, touch.y + .25 + Math.sin(t * .3) * .05, dist)
      camera.lookAt(touch.x + (portrait ? 0 : -.35), touch.y, 0)
      const b = Math.max(0, Math.min(1, (t - APPROACH) / BURST))
      result.touched = t >= APPROACH
      result.burst = b
      result.phase = t < APPROACH ? 'approach' : b < 1 ? (b < .08 ? 'touch' : 'burst') : 'done'
      const near = Math.max(0, 1 - gap / .5)
      spark.material.opacity = Math.min(1, near * near * .8 + b * 2)
      spark.scale.setScalar(.25 + near * .35 + quartOut(b) * 26)
      ring.material.opacity = b > 0 ? (1 - b) * .9 : 0
      ring.scale.setScalar(.05 + quartOut(b) * 9); ring.lookAt(camera.position)
      fromAI.intensity = near * 3 + b * 20
      wire.material.opacity = .45 + near * .35 + Math.sin(t * 3) * .05
      particleMat.uniforms.uTime.value = t; particleMat.uniforms.uBurst.value = quartOut(b)
      particleMat.uniforms.uScale.value = (portrait ? 420 : 300) * window.devicePixelRatio
      skin.emissiveIntensity = .25 + near * .5
      return result
    },
    dispose() {
      scene.traverse((o) => { o.geometry?.dispose(); if (o.material) { o.material.map?.dispose(); o.material.dispose() } })
      flareTex.dispose()
    },
  }
}
