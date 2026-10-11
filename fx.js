import * as THREE from 'three'

// Shared, per-frame uniforms for every "living" surface. The world mutates the
// values in place; patched materials and shader materials reference them.
export const RIPPLES = 8
export function createLiveUniforms() {
  return {
    uTime: { value: 0 },
    uBleed: { value: new THREE.Color('#d8ff69') },
    uBase: { value: new THREE.Color('#2a3b46') },
    uBleedAmt: { value: 0 },
    uPlayer: { value: new THREE.Vector3() },
    uFlow: { value: new THREE.Vector2() },
    uInk: { value: 1 },
    uRipples: { value: Array.from({ length: RIPPLES }, () => new THREE.Vector4(0, 0, -99, 0)) },
    uRippleCol: { value: Array.from({ length: RIPPLES }, () => new THREE.Color('#d8ff69')) },
  }
}

const NOISE = /* glsl */`
float hgHash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float hgNoise(vec2 p) { vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hgHash(i), hgHash(i + vec2(1, 0)), u.x), mix(hgHash(i + vec2(0, 1)), hgHash(i + vec2(1, 1)), u.x), u.y); }
float hgFbm(vec2 p) { float v = 0.0, a = .5; for (int i = 0; i < 3; i++) { v += a * hgNoise(p); p = p * 2.03 + 17.1; a *= .5; } return v; }
`
const RIPPLE_FN = /* glsl */`
uniform vec4 uRipples[${RIPPLES}];
uniform vec3 uRippleCol[${RIPPLES}];
vec3 hgRipples(vec2 xz, float time, out float height) {
  vec3 acc = vec3(0.0); height = 0.0;
  for (int i = 0; i < ${RIPPLES}; i++) {
    vec4 r = uRipples[i]; float age = time - r.z;
    if (age < 0.0 || age > 3.2) continue;
    float dist = length(xz - r.xy), rad = age * 1.45;
    float fade = (1.0 - age / 3.2) * r.w;
    float band = (dist - rad) * 5.0;
    float ring = exp(-band * band) * fade;
    height += sin(band * 2.2) * exp(-band * band * .35) * fade;
    acc += uRippleCol[i] * ring;
  }
  return acc;
}
`

// Patch a MeshStandardMaterial so it breathes with the world: an advected ink
// colour field (walls), footstep colour ripples (floors) and a proximity bleed
// of nearby artworks' dominant colour. Lighting stays physically based.
export function patchLiving(material, live, { ink = false, ripples = false, bleed = .08 } = {}) {
  // Per-material style slot: a pixel texture projected in world space along the
  // dominant face axis, so every box, arch and column becomes blocks or bricks.
  const style = material.userData.style = { uStyleMap: { value: null }, uStyleMix: { value: 0 }, uStyleScale: { value: 1 } }
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, live, style)
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vHgWorld; varying vec3 vHgNormal;')
      .replace('#include <project_vertex>', '#include <project_vertex>\nvHgWorld = (modelMatrix * vec4(transformed, 1.0)).xyz; vHgNormal = normalize(mat3(modelMatrix) * objectNormal);')
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <map_fragment>', `#include <map_fragment>
if (uStyleMix > 0.0) {
  vec3 an = abs(normalize(vHgNormal)); vec3 sp = vHgWorld * uStyleScale;
  vec3 st = an.x > an.y && an.x > an.z ? texture2D(uStyleMap, sp.zy).rgb : an.y > an.z ? texture2D(uStyleMap, sp.xz).rgb : texture2D(uStyleMap, sp.xy).rgb;
  diffuseColor.rgb = mix(diffuseColor.rgb, st, uStyleMix);
}`)
      .replace('#include <common>', `#include <common>
varying vec3 vHgWorld; varying vec3 vHgNormal;
uniform sampler2D uStyleMap; uniform float uStyleMix, uStyleScale;
uniform float uTime, uBleedAmt, uInk; uniform vec3 uBleed, uBase, uPlayer; uniform vec2 uFlow;
${NOISE}
${ripples ? RIPPLE_FN : ''}
vec3 hgLiving() {
  vec2 d = vHgWorld.xz - uPlayer.xz; float near = exp(-dot(d, d) * .045);
  // The bleed pools around the visitor rather than tinting whole surfaces.
  vec3 c = uBleed * uBleedAmt * ${bleed.toFixed(3)} * (.1 + near * 1.3);
  ${ink ? `
  vec2 p = vec2(vHgWorld.x + vHgWorld.z, vHgWorld.y) * .3 + uFlow * .45 + vec2(uTime * .025, -uTime * .018);
  p += normalize(d + 1e-4) * near * .55;
  float n = hgFbm(p + hgFbm(p * 1.6 + uTime * .04) * 1.4);
  float inkMask = smoothstep(.5, .86, n);
  vec3 hue = mix(uBase, uBleed, clamp(.35 + uBleedAmt * .65 + .2 * sin(n * 7.0 + uTime * .25), 0.0, 1.0));
  c += hue * inkMask * uInk * (.07 + near * .3);` : ''}
  ${ripples ? `float h; c += hgRipples(vHgWorld.xz, uTime, h) * .55;` : ''}
  return c;
}`)
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += hgLiving();')
  }
  material.customProgramCacheKey = () => 'hg-living-' + (ink ? 1 : 0) + (ripples ? 1 : 0) + bleed
  return material
}

// Reflective water for the rotunda. The same shader runs with or without a
// Reflector render target (High uses real reflections, lower presets fake them).
export function waterShader(live, reflect) {
  return {
    name: 'GalleryWater',
    uniforms: {
      color: { value: null }, tDiffuse: { value: null }, textureMatrix: { value: null },
      ...live,
      uMoonDir: { value: new THREE.Vector3(.45, .52, -.72).normalize() },
      uPortalHue: { value: ['#ff7a5c', '#d8ff69', '#6ee7dd', '#a98bff', '#ffc95c'].map((c) => new THREE.Color(c)) },
      uStyle: { value: 0 }, uStyleMap: { value: null },
    },
    vertexShader: /* glsl */`
      uniform mat4 textureMatrix; varying vec4 vUv4; varying vec3 vWorld;
      void main() { vUv4 = textureMatrix * vec4(position, 1.0); vec4 w = modelMatrix * vec4(position, 1.0); vWorld = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: /* glsl */`
      uniform sampler2D tDiffuse, uStyleMap; uniform vec3 color; uniform float uTime, uBleedAmt, uStyle; uniform vec3 uBleed, uMoonDir, uPlayer; uniform vec3 uPortalHue[5];
      varying vec4 vUv4; varying vec3 vWorld;
      ${NOISE}
      ${RIPPLE_FN}
      void main() {
        float h; vec3 glow = hgRipples(vWorld.xz, uTime, h);
        vec2 q = vWorld.xz * .55;
        vec2 wave = vec2(hgNoise(q + uTime * .25) - .5, hgNoise(q.yx - uTime * .21 + 3.1) - .5);
        vec3 n = normalize(vec3(wave.x * .18 + h * .35, 1.0, wave.y * .18 + h * .35));
        vec3 view = normalize(cameraPosition - vWorld);
        float fres = pow(1.0 - max(dot(view, n), 0.0), 3.0);
        vec3 deep = vec3(.006, .014, .022);
        ${reflect ? `vec4 uv = vUv4; uv.xy += n.xz * .9 * uv.w * .045; vec3 refl = texture2DProj(tDiffuse, uv).rgb * color;`
          : `// No reflection pass: fake the portal wall as coloured bands on the water.
        vec3 rr = reflect(-view, n); float ang = atan(rr.x, -rr.z);
        vec3 refl = vec3(.008, .014, .024);
        for (int i = 0; i < 5; i++) { float a = float(i - 2) * .4363; float band = exp(-pow((ang - a) * 11.0, 2.0)); refl += uPortalHue[i] * band * .55; }
        refl *= smoothstep(-.05, .25, rr.y) * (1.0 - smoothstep(.35, .7, rr.y));`}
        vec3 r = reflect(-view, n);
        float glint = pow(max(dot(r, uMoonDir), 0.0), 900.0) * 1.6;
        vec2 d = vWorld.xz - uPlayer.xz; float near = exp(-dot(d, d) * .05);
        vec3 col = deep + refl * (.45 + .55 * fres) + glint * vec3(.85, .9, 1.0) + glow * .9 + uBleed * uBleedAmt * near * .06;
        if (uStyle > .5) {
          // Pixel water: tiled texture scrolling in steps, a quantized shimmer, ripples kept.
          vec2 wuv = floor((vWorld.xz * .5 + vec2(floor(uTime * 4.0) / 16.0, 0.0)) * 16.0) / 16.0;
          vec3 pix = texture2D(uStyleMap, wuv).rgb;
          col = pix * (uStyle > 1.5 ? 1.0 : .8) + floor(glow * 3.0) / 3.0 * .6 + floor(clamp(refl, 0.0, 1.0) * 4.0) / 4.0 * .35;
        }
        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  }
}

// Night sky dome: deep gradient, procedural stars and a large moon with halo.
export function createSky() {
  const material = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uMoonDir: { value: new THREE.Vector3(.45, .52, -.72).normalize() }, uTint: { value: new THREE.Color('#0b1626') }, uDay: { value: 0 } },
    vertexShader: `varying vec3 vDir; void main() { vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */`
      uniform float uTime, uDay; uniform vec3 uMoonDir, uTint; varying vec3 vDir;
      ${NOISE}
      void main() {
        vec3 d = normalize(vDir);
        float h = clamp(d.y, -0.2, 1.0);
        vec3 col = mix(vec3(.018, .028, .04), uTint, smoothstep(-.05, .55, h));
        col = mix(col, vec3(.004, .006, .012), smoothstep(.55, 1.0, h));
        // Stars: one jittered point per cell, drawn as a tiny soft dot.
        vec2 sp = vec2(atan(d.z, d.x) * 90.0, asin(clamp(d.y, -1.0, 1.0)) * 90.0);
        vec2 cell = floor(sp), f = fract(sp);
        float s = hgHash(cell); vec2 c = vec2(hgHash(cell + 7.1), hgHash(cell + 3.3));
        float star = smoothstep(.07, 0.0, length(f - c)) * step(.86, s);
        float tw = .55 + .45 * sin(uTime * (1.0 + s * 2.0) + s * 40.0);
        col += vec3(.85, .9, 1.0) * star * tw * (.5 + 1.5 * (s - .86) / .14) * smoothstep(0.0, .2, h);
        float m = dot(d, uMoonDir);
        float disc = smoothstep(.99935, .99955, m);
        float crater = hgNoise(d.xy * 420.0) * .16 + hgNoise(d.yz * 150.0) * .14;
        col = mix(col, vec3(1.5, 1.46, 1.36) * (1.0 - crater), disc);
        col += vec3(.45, .55, .7) * pow(max(m, 0.0), 1800.0) * .8 + vec3(.1, .15, .24) * pow(max(m, 0.0), 90.0);
        if (uDay > .5) {
          // Daylight for the bright 8-bit look: flat sky with chunky drifting clouds.
          vec2 cp = floor(vec2(atan(d.z, d.x) * 24.0 + uTime * .05, d.y * 40.0));
          float cloud = step(.62, hgNoise(cp * .35)) * smoothstep(.05, .2, h) * (1.0 - smoothstep(.55, .7, h));
          col = mix(uTint, vec3(1.0), cloud * .95);
        }
        gl_FragColor = vec4(col, 1.0);
      }`,
    side: THREE.BackSide, depthWrite: false, fog: false, toneMapped: false,
  })
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(80, 48, 24), material)
  mesh.renderOrder = -10; mesh.frustumCulled = false
  return mesh
}

// Floating glowing points (orbs or dust) animated entirely on the GPU.
export function createFloaters({ count, area, size, colors, height = [0.4, 4], speed = .4, opacity = 1 }) {
  const g = new THREE.BufferGeometry()
  const pos = new Float32Array(count * 3), col = new Float32Array(count * 3), seed = new Float32Array(count)
  const palette = colors.map((c) => new THREE.Color(c))
  for (let i = 0; i < count; i++) {
    const p = area(i)
    pos.set([p.x, height[0] + Math.random() * (height[1] - height[0]), p.z], i * 3)
    const c = palette[i % palette.length]; col.set([c.r, c.g, c.b], i * 3)
    seed[i] = Math.random() * 100
  }
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  g.setAttribute('color', new THREE.BufferAttribute(col, 3))
  g.setAttribute('seed', new THREE.BufferAttribute(seed, 1))
  const material = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uSize: { value: size }, uScale: { value: 400 * Math.min(2, window.devicePixelRatio || 1) }, uMax: { value: (size > .2 ? 42 : 7) * Math.min(2, window.devicePixelRatio || 1) }, uOpacity: { value: opacity }, uSpeed: { value: speed } },
    vertexShader: `attribute float seed; attribute vec3 color; uniform float uTime, uSize, uScale, uSpeed, uMax; varying vec3 vColor; varying float vPulse;
      void main() { vec3 p = position; float t = uTime * uSpeed + seed;
        p += vec3(sin(t * .7) * .35, sin(t * 1.1) * .28, cos(t * .6) * .35);
        vec4 mv = modelViewMatrix * vec4(p, 1.0); vPulse = .65 + .35 * sin(t * 2.3);
        vColor = color; gl_PointSize = min(uSize * uScale / -mv.z * vPulse, uMax); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform float uOpacity; varying vec3 vColor; varying float vPulse;
      void main() { vec2 c = gl_PointCoord - .5; float r = length(c); float a = smoothstep(.5, 0.0, r); a = a * a;
        gl_FragColor = vec4(vColor * (1.2 + vPulse), a * uOpacity); }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false,
  })
  const points = new THREE.Points(g, material)
  points.frustumCulled = false
  return points
}

// Soft volumetric-looking beam: bright under the fixture, dissolving toward
// the floor and at grazing edges so it never reads as a solid cone.
export function beamMaterial(opacity = .16, color = '#e9ffc2', height = 3.4) {
  return new THREE.ShaderMaterial({
    uniforms: { color: { value: new THREE.Color(color) }, opacity: { value: opacity }, height: { value: height } },
    vertexShader: `varying float vY; varying vec3 vN; varying vec3 vV;
      void main() { vY = position.y; vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform vec3 color; uniform float opacity; uniform float height; varying float vY; varying vec3 vN; varying vec3 vV;
      void main() { float a = clamp(vY / height + .5, 0.0, 1.0);
        float edge = pow(abs(dot(normalize(vN), normalize(vV))), 1.6);
        gl_FragColor = vec4(color, opacity * a * a * edge * smoothstep(1.0, .8, a)); }`,
    transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
  })
}

// Portal surface: a slow, swirling colour field with a bright vertical seam,
// edge glow and hover response; each portal gets its own hue.
export function portalMaterial(hue) {
  return new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uHue: { value: new THREE.Color(hue) }, uHover: { value: 0 }, uSeed: { value: Math.random() * 10 }, uSteps: { value: 0 } },
    vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */`
      uniform float uTime, uHover, uSeed, uSteps; uniform vec3 uHue; varying vec2 vUv;
      ${NOISE}
      void main() {
        vec2 uvq = uSteps > 0.0 ? floor(vUv * vec2(10.0, 22.0)) / vec2(10.0, 22.0) : vUv;
        vec2 p = uvq * vec2(2.0, 4.0); float t = uTime * .18 + uSeed;
        float n = hgFbm(p + vec2(hgFbm(p + t), hgFbm(p * 1.3 - t)) * 1.6);
        float seam = exp(-pow((vUv.x - .5) * 9.0, 2.0)) * (.4 + .6 * smoothstep(.0, 1.0, vUv.y));
        float edge = smoothstep(.45, .5, abs(vUv.x - .5)) + smoothstep(.47, .5, abs(vUv.y - .5));
        vec3 col = uHue * (.1 + n * .62) + uHue * seam * (.7 + uHover * 1.2) + vec3(1.0) * seam * .12;
        col *= .75 + .25 * sin(uTime * 1.2 + uSeed);
        col += uHue * edge * 1.9;
        float fade = smoothstep(0.0, .18, vUv.y);
        if (uSteps > 0.0) col = floor(col * uSteps) / uSteps;
        gl_FragColor = vec4(col * (1.0 + uHover * .6), .92 * fade + edge * .08);
      }`,
    transparent: true, depthWrite: false, toneMapped: false, side: THREE.DoubleSide,
  })
}

// Reflector shader that adds a dim, tinted reflection over an opaque floor.
export const FLOOR_REFLECTION = {
  name: 'GalleryFloorReflection',
  uniforms: { color: { value: null }, tDiffuse: { value: null }, textureMatrix: { value: null } },
  vertexShader: `uniform mat4 textureMatrix; varying vec4 vUv;
    void main() { vUv = textureMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: `uniform vec3 color; uniform sampler2D tDiffuse; varying vec4 vUv;
    void main() { gl_FragColor = vec4(texture2DProj(tDiffuse, vUv).rgb * color, 1.0); }`,
}
