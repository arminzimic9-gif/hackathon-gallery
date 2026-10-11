// Artwork textures: real collection images when provided, otherwise generated placeholder posters.
import * as THREE from 'three';

const PALETTES = [['#0b1020', '#6fd3ff', '#ff8a2a'], ['#140b1c', '#c46bff', '#6fd3ff'], ['#0d1511', '#7dffb2', '#ffd36f'], ['#1a0c0c', '#ff5e4d', '#ffe1c2'], ['#08121c', '#e9f3ff', '#2f6bff'], ['#11100a', '#ffb347', '#e9f3ff']];
const TITLES = ['Signal & Noise', 'The Prompt Has Left the Chat', 'Agents at Dawn', 'Build / Break / Become', 'Latent Space', 'Orbit of Ideas', 'Context Window', 'Ship It', 'Two Kinds of Makers', 'Recursive Dreams', 'Hello, World', 'Token Rain'];

export function placeholderArt(count = 24) {
  return Array.from({ length: count }, (_, i) => ({ id: 'sample-' + i, title: TITLES[i % TITLES.length], author: 'Sample piece', caption: 'Placeholder art. Curate the gallery to replace it with hackathon submissions.', sample: true, palette: PALETTES[i % PALETTES.length], seed: i }));
}

function posterCanvas(item, w = 768, h = 576) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d');
  const [bg, a, b] = item.palette || PALETTES[0];
  g.fillStyle = bg; g.fillRect(0, 0, w, h);
  let s = (item.seed || 1) * 9301 + 49297; const r = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  const kind = (item.seed || 0) % 4;
  g.globalCompositeOperation = 'lighter';
  if (kind === 0) { for (let i = 0; i < 14; i++) { g.strokeStyle = i % 2 ? a : b; g.globalAlpha = 0.5; g.lineWidth = 2 + r() * 6; g.beginPath(); g.arc(w * 0.62, h * 0.48, 30 + i * 18, 0, Math.PI * 2); g.stroke(); } }
  if (kind === 1) { for (let i = 0; i < 40; i++) { g.fillStyle = r() > 0.5 ? a : b; g.globalAlpha = 0.25 + r() * 0.5; g.fillRect(r() * w, r() * h, 20 + r() * 160, 4 + r() * 14); } }
  if (kind === 2) { const gr = g.createRadialGradient(w * .6, h * .45, 10, w * .6, h * .45, h * .7); gr.addColorStop(0, a); gr.addColorStop(0.4, b); gr.addColorStop(1, bg); g.fillStyle = gr; g.globalAlpha = 0.9; g.fillRect(0, 0, w, h); }
  if (kind === 3) { g.globalAlpha = 0.8; for (let i = 0; i < 9; i++) { g.fillStyle = i % 2 ? a : b; g.beginPath(); g.moveTo(w * 0.3 + i * 40, h); g.lineTo(w * 0.55 + i * 30, h * 0.15 + i * 10); g.lineTo(w * 0.58 + i * 30, h * 0.15 + i * 10); g.lineTo(w * 0.33 + i * 40, h); g.fill(); } }
  g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
  g.fillStyle = '#e9f3ff'; g.font = `800 ${Math.round(h * 0.085)}px ui-sans-serif, system-ui, sans-serif`;
  const words = item.title.toUpperCase().split(' '); let line = '', y = h * 0.72; const lines = [];
  for (const wd of words) { if (g.measureText(line + wd).width > w * 0.62) { lines.push(line); line = ''; } line += wd + ' '; } lines.push(line);
  lines.slice(-3).forEach((l, i) => g.fillText(l.trim(), w * 0.07, y + i * h * 0.095 - (lines.length - 1) * h * 0.095));
  g.fillStyle = a; g.font = `600 ${Math.round(h * 0.032)}px ui-monospace, monospace`; g.fillText('HACKATHON STATION · ' + String((item.seed || 0) + 1).padStart(2, '0'), w * 0.07, h * 0.9);
  return c;
}

const texCache = new Map();
export function artTexture(item, onReady) {
  if (texCache.has(item.id)) return texCache.get(item.id);
  let tex;
  if (item.url) {
    tex = new THREE.TextureLoader().load(item.url, (t) => onReady?.(t));
  } else {
    tex = new THREE.CanvasTexture(posterCanvas(item));
  }
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  texCache.set(item.id, tex);
  return tex;
}
