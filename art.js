import * as THREE from 'three'
import { FONT_FAMILY } from './fonts.js'

export const FONT = `'${FONT_FAMILY}', Inter, Arial, sans-serif`
export const clamp = THREE.MathUtils.clamp
export const POSTER_STYLES = [
  ['#d8ff69', '#1f2713', '#f2ffe0'], ['#ff6d58', '#361d20', '#fff3df'],
  ['#8757ff', '#1c1535', '#e5ddff'], ['#f7c34d', '#302615', '#fff8d7'],
  ['#6ee7dd', '#122d30', '#e5fffa'], ['#fa899e', '#391c2c', '#fff0f2'],
  ['#9cb5ff', '#172442', '#f1f5ff'], ['#f69d4e', '#382415', '#ffefd5'],
  ['#c1f36d', '#25310f', '#f3ffe0'],
]

export function wrapLines(c, text, maxWidth) {
  const words = String(text || '').split(' '), lines = []; let line = ''
  for (const word of words) {
    const next = line ? line + ' ' + word : word
    if (c.measureText(next).width > maxWidth && line) { lines.push(line); line = word } else line = next
  }
  if (line) lines.push(line)
  return lines
}

// Labelled placeholder poster, drawn procedurally so the gallery is never empty.
export function posterCanvas(art) {
  const canvas = document.createElement('canvas')
  const w = 640, h = Math.round(w / clamp(art.ratio || 0.8, 0.55, 1.6))
  canvas.width = w; canvas.height = h
  const c = canvas.getContext('2d')
  const k = art.palette || 0, p = POSTER_STYLES[k % POSTER_STYLES.length]
  c.fillStyle = p[1]; c.fillRect(0, 0, w, h)
  c.globalAlpha = 0.13; c.strokeStyle = p[0]
  for (let i = -h; i < w + h; i += 34) { c.beginPath(); c.moveTo(i, 0); c.lineTo(i + h, h); c.stroke() }
  c.globalAlpha = 1
  c.save(); c.translate(w * (0.5 + Math.sin(k * 2.4) * .14), h * .42); c.rotate((k % 4 - 1.5) * .25)
  c.fillStyle = p[0]
  if (k % 3 === 0) { for (let i = 0; i < 7; i++) { c.strokeStyle = p[0]; c.lineWidth = 15 - i; c.beginPath(); c.arc(0, 0, 65 + i * 25, 0, Math.PI * 2); c.stroke() } }
  else if (k % 3 === 1) { for (let i = 0; i < 7; i++) c.fillRect(-140 + i * 42, -170 + i * 22, 44, 280 - i * 18) }
  else { for (let i = 0; i < 6; i++) { c.rotate(Math.PI / 3); c.fillRect(-22, -180, 44, 210) } c.fillStyle = p[1]; c.beginPath(); c.arc(0, 0, 76, 0, Math.PI * 2); c.fill() }
  c.restore()
  const grad = c.createLinearGradient(0, h * .5, 0, h)
  grad.addColorStop(0, 'transparent'); grad.addColorStop(.55, p[1]); grad.addColorStop(1, p[1])
  c.fillStyle = grad; c.fillRect(0, h * .45, w, h * .55)
  c.fillStyle = p[2]; c.font = `700 56px ${FONT}`
  const lines = wrapLines(c, (art.title || 'SAMPLE ART').toUpperCase(), w - 84)
  const base = h - 135 - lines.length * 60
  lines.forEach((s, i) => c.fillText(s, 42, base + i * 60, w - 84))
  c.fillStyle = p[0]; c.font = `600 21px ${FONT}`
  c.fillText(art.placeholder ? 'SAMPLE  /  REPLACE WITH YOUR ART' : 'LOADING IMAGE', 42, h - 46, w - 84)
  c.fillRect(42, 44, 76, 7)
  return canvas
}

export function textTexture(label, { width = 1024, height = 160, size = 64, weight = 700, color = '#eef6ea', bg = null, accent = null, align = 'center', tracking = 0 } = {}) {
  const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height
  const c = canvas.getContext('2d')
  if (bg) { c.fillStyle = bg; c.fillRect(0, 0, width, height) }
  if (accent) { c.strokeStyle = accent; c.lineWidth = 4; c.strokeRect(2, 2, width - 4, height - 4) }
  c.fillStyle = color; c.font = `${weight} ${size}px ${FONT}`; c.textAlign = align; c.textBaseline = 'middle'
  if ('letterSpacing' in c) c.letterSpacing = tracking + 'px'
  c.fillText(label, align === 'center' ? width / 2 : 24, height / 2 + size * .04, width - 48)
  const t = new THREE.CanvasTexture(canvas); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4
  return t
}

// An intentional "open wall" placeholder: a reserved frame inviting submissions.
export function openWallCanvas(number, hue, ratio = .8) {
  const canvas = document.createElement('canvas'), w = 480, h = Math.round(w / clamp(ratio, .55, 1.6))
  canvas.width = w; canvas.height = h
  const c = canvas.getContext('2d')
  const g = c.createLinearGradient(0, 0, w, h); g.addColorStop(0, '#141a1f'); g.addColorStop(1, '#0b0f12')
  c.fillStyle = g; c.fillRect(0, 0, w, h)
  c.strokeStyle = hue; c.globalAlpha = .55; c.lineWidth = 2; c.strokeRect(26, 26, w - 52, h - 52)
  c.globalAlpha = .18; for (let i = 0; i < 9; i++) { c.beginPath(); c.arc(w * .5, h * .42, 30 + i * 22, 0, Math.PI * 2); c.stroke() }
  c.globalAlpha = 1; c.fillStyle = hue; c.font = `600 22px ${FONT}`; c.fillText('OPEN WALL  ' + String(number).padStart(2, '0'), 46, h - 112, w - 92)
  c.fillStyle = '#e8eee9'; c.font = `700 34px ${FONT}`; c.fillText('Your piece', 46, h - 70, w - 92)
  c.fillStyle = '#9fb0aa'; c.font = `400 20px ${FONT}`; c.fillText('could hang here · submit via Curate', 46, h - 40, w - 92)
  return canvas
}

// Soft radial glow used for coloured light pools and wall halos.
let glowTexture = null
export function radialGlow() {
  if (glowTexture) return glowTexture
  const c = document.createElement('canvas'); c.width = c.height = 128
  const g = c.getContext('2d'), grad = g.createRadialGradient(64, 64, 0, 64, 64, 64)
  grad.addColorStop(0, 'rgba(255,255,255,1)'); grad.addColorStop(.35, 'rgba(255,255,255,.45)'); grad.addColorStop(1, 'rgba(255,255,255,0)')
  g.fillStyle = grad; g.fillRect(0, 0, 128, 128)
  glowTexture = new THREE.CanvasTexture(c); return glowTexture
}

// Dominant colour: saturation-weighted average of a tiny downsample, lifted to
// a usable light colour so dark pieces still bleed something visible.
export function dominantColor(source) {
  try {
    const s = document.createElement('canvas'); s.width = s.height = 24
    const c = s.getContext('2d', { willReadFrequently: true }); c.drawImage(source, 0, 0, 24, 24)
    const d = c.getImageData(0, 0, 24, 24).data
    let r = 0, g = 0, b = 0, wsum = 0
    for (let i = 0; i < d.length; i += 4) {
      const R = d[i] / 255, G = d[i + 1] / 255, B = d[i + 2] / 255
      const max = Math.max(R, G, B), min = Math.min(R, G, B), sat = max ? (max - min) / max : 0
      const w = .05 + sat * sat * max
      r += R * w; g += G * w; b += B * w; wsum += w
    }
    const col = new THREE.Color(r / wsum, g / wsum, b / wsum)
    const hsl = {}; col.getHSL(hsl)
    return new THREE.Color().setHSL(hsl.h, clamp(hsl.s * 1.25, .35, 1), clamp(hsl.l, .45, .62))
  } catch { return new THREE.Color('#d8ff69') }
}
