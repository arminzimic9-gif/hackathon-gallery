// Renderer, post-processing, asset loading and the active-scene loop.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';

// cinematic finish: teal/orange grade, vignette and fine film grain (after tone mapping)
const FilmShader = {
  uniforms: { tDiffuse: { value: null }, uTime: { value: 0 }, uVignette: { value: 0.32 }, uGrain: { value: 0.035 } },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }`,
  fragmentShader: `uniform sampler2D tDiffuse; uniform float uTime, uVignette, uGrain; varying vec2 vUv;
    float rnd(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233)) + uTime) * 43758.5453); }
    void main(){ vec3 c = texture2D(tDiffuse, vUv).rgb;
      float l = dot(c, vec3(.2126,.7152,.0722));
      c = mix(c, c * vec3(0.92,1.0,1.08), 1. - smoothstep(.15,.6,l));   // cool shadows
      c = mix(c, c * vec3(1.07,1.0,0.93), smoothstep(.45,.95,l));       // warm highlights
      vec2 d = vUv - .5; c *= 1. - uVignette * dot(d,d) * 2.2;
      c += (rnd(vUv * 900.) - .5) * uGrain;
      gl_FragColor = vec4(c, 1.); }`,
};

export const isTouch = () => matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;

export function createEngine(root, assetUrl) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  const maxDpr = isTouch() ? 1.5 : 2;
  renderer.setPixelRatio(Math.min(devicePixelRatio, maxDpr));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.domElement.className = 'world';
  root.appendChild(renderer.domElement);

  const camera = new THREE.PerspectiveCamera(62, 1, 0.1, 6000);
  const passScene = new THREE.Scene();
  const renderPass = new RenderPass(passScene, camera);
  const composer = new EffectComposer(renderer);
  const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.55, 0.45, 0.9);
  composer.addPass(renderPass);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());
  const film = new ShaderPass(FilmShader);
  composer.addPass(film);

  const loader = new GLTFLoader();
  const cache = new Map();
  const load = (name) => {
    if (!cache.has(name)) cache.set(name, new Promise((res, rej) => loader.load(assetUrl(name), res, undefined, rej)));
    return cache.get(name);
  };

  function resize() {
    const w = root.clientWidth || innerWidth, h = root.clientHeight || innerHeight;
    renderer.setSize(w, h, false);
    composer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  addEventListener('resize', resize);
  resize();

  // adaptive quality: drop pixel ratio and bloom when frames get slow
  let quality = 2, slowFrames = 0, fastFrames = 0;
  function adapt(dt) {
    if (dt > 1 / 38) { slowFrames++; fastFrames = 0; } else if (dt < 1 / 58) { fastFrames++; slowFrames = 0; }
    if (slowFrames > 90 && quality > 0) { quality--; slowFrames = 0; applyQuality(); }
    if (fastFrames > 600 && quality < 2) { quality++; fastFrames = 0; applyQuality(); }
  }
  function applyQuality() {
    const dpr = [0.75, 1.0, Math.min(devicePixelRatio, maxDpr)][quality];
    renderer.setPixelRatio(dpr);
    bloom.enabled = quality > 0;
    resize();
  }

  let active = null, last = performance.now(), running = true;
  function setScene(s) { active = s; renderPass.scene = s.scene; if (s.bloom) Object.assign(bloom, s.bloom); }
  function frame(now) {
    if (!running) return;
    requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    adapt(dt);
    film.uniforms.uTime.value = (now / 1000) % 100;
    if (active) { active.update?.(dt, now / 1000); composer.render(); }
  }
  requestAnimationFrame(frame);

  return {
    THREE, renderer, camera, composer, bloom, load, setScene, resize,
    // test helper: advance the active scene by `seconds` of simulated time, then render one frame
    step(seconds, dt = 1 / 30) { let t = performance.now() / 1000; for (let s = 0; s < seconds; s += dt) { t += dt; active?.update?.(dt, t); } composer.render(); },
    get quality() { return quality; },
    dispose() { running = false; renderer.dispose(); renderer.domElement.remove(); removeEventListener('resize', resize); },
  };
}

// Baked-light GLB rooms: static meshes carry their lightmap in emissiveMap.
export function prepareBakedRoom(root, { bakedIntensity = 1.0, lightIntensity = 1.0 } = {}) {
  const special = {};
  root.traverse((o) => {
    if (!o.isMesh) return;
    special[o.name] = o;
    const m = o.material;
    if (o.name === 'FORCEFIELD' || o.name === 'WINDOW') {
      o.material = new THREE.MeshBasicMaterial({ color: 0x4a9bff, transparent: true, opacity: 0.045, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
      return;
    }
    if (m && m.emissiveMap) {
      m.color.setRGB(0, 0, 0); m.metalness = 0; m.roughness = 1;
      m.emissiveIntensity = bakedIntensity;
      m.emissiveMap.colorSpace = THREE.SRGBColorSpace;
    } else if (o.name.startsWith('EMISSIVE') || o.parent?.name === 'EMISSIVE') {
      [].concat(o.material).forEach((mm) => { mm.emissiveIntensity = lightIntensity; mm.toneMapped = true; });
    }
  });
  return special;
}

export function findEmpties(root) {
  const out = {};
  root.traverse((o) => { if (!o.isMesh && o.name) out[o.name] = o; });
  return out;
}
