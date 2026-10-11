export function createGalleryAudio() {
  const Audio = window.AudioContext || window.webkitAudioContext
  if (!Audio) return { start: async () => false, stop: () => {}, step: () => {}, cue: () => {}, hover: () => {}, setStyle: () => {}, dispose: () => {} }
  let context = null, drone = [], master = null, active = false
  async function start() {
    if (!context) {
      context = new Audio()
      master = context.createGain(); master.gain.value = .0001; master.connect(context.destination)
      for (const [frequency, volume] of [[55, .15], [82.4, .065], [110.2, .025]]) {
        const osc = context.createOscillator(), gain = context.createGain()
        osc.type = 'sine'; osc.frequency.value = frequency; gain.gain.value = volume
        osc.connect(gain); gain.connect(master); osc.start(); drone.push(osc)
      }
    }
    await context.resume()
    active = true
    master.gain.cancelScheduledValues(context.currentTime)
    master.gain.setTargetAtTime(.26, context.currentTime, .55)
    return true
  }
  function stop() {
    active = false
    if (!context) return
    master.gain.cancelScheduledValues(context.currentTime)
    master.gain.setTargetAtTime(.0001, context.currentTime, .18)
  }
  let lastHover = 0, look = 'cinematic'
  // Each world style has its own voice: chiptune squares for Retro, crunchy
  // noise for Voxel, soft tones for Cinematic.
  function setStyle(id) { look = id }
  function hover() {
    if (!active || !context || context.currentTime - lastHover < .09) return
    lastHover = context.currentTime; tone(look === 'retro' ? 1320 : 1760 + Math.random() * 220, context.currentTime, .07, .035, look === 'retro' ? 'square' : 'sine')
  }
  function step(kind) {
    if (!active || !context) return
    if (look === 'retro') { tone(180 + Math.random() * 40, context.currentTime, .05, .05, 'square'); return }
    if (kind === 'hub') { tone(220 + Math.random() * 60, context.currentTime, .35, .03, 'sine') }
    const length = Math.floor(context.sampleRate * .1)
    const buffer = context.createBuffer(1, length, context.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (length * .18))
    const source = context.createBufferSource(), lowpass = context.createBiquadFilter(), gain = context.createGain()
    source.buffer = buffer; lowpass.type = 'lowpass'; lowpass.frequency.value = look === 'voxel' ? 900 + Math.random() * 600 : 180 + Math.random() * 100
    gain.gain.value = .13
    source.connect(lowpass); lowpass.connect(gain); gain.connect(master)
    source.start(); source.onended = () => { source.disconnect(); lowpass.disconnect(); gain.disconnect() }
  }
  // Ceremony cues are synthesized on demand: a soft snare roll before each
  // place, a bright triad on the reveal, and a longer chord for the finale.
  function tone(frequency, at, length, volume, type = 'triangle') {
    const osc = context.createOscillator(), gain = context.createGain()
    osc.type = type; osc.frequency.value = frequency
    gain.gain.setValueAtTime(.0001, at); gain.gain.exponentialRampToValueAtTime(volume, at + .02)
    gain.gain.exponentialRampToValueAtTime(.0001, at + length)
    osc.connect(gain); gain.connect(master); osc.start(at); osc.stop(at + length + .05)
    osc.onended = () => { osc.disconnect(); gain.disconnect() }
  }
  function cue(kind) {
    if (!active || !context) return
    const now = context.currentTime
    if (kind === 'tease') {
      const length = Math.floor(context.sampleRate * 2.1), buffer = context.createBuffer(1, length, context.sampleRate), data = buffer.getChannelData(0)
      for (let i = 0; i < length; i++) { const t = i / context.sampleRate; data[i] = (Math.random() * 2 - 1) * (.35 + .65 * Math.abs(Math.sin(t * Math.PI * 14))) * (t / 2.1) }
      const source = context.createBufferSource(), band = context.createBiquadFilter(), gain = context.createGain()
      source.buffer = buffer; band.type = 'bandpass'; band.frequency.value = 1700; band.Q.value = .8; gain.gain.value = .22
      source.connect(band); band.connect(gain); gain.connect(master); source.start(now)
      source.onended = () => { source.disconnect(); band.disconnect(); gain.disconnect() }
    } else if (kind === 'winner') {
      [523.25, 659.25, 783.99].forEach((f, i) => tone(f, now + i * .07, look === 'retro' ? .25 : 1.4, .16, look === 'retro' ? 'square' : 'triangle'))
    } else if (kind === 'finale') {
      [392, 523.25, 659.25, 1046.5].forEach((f, i) => tone(f, now + i * .11, 2.6, .13))
    } else if (kind === 'portal') {
      const osc = context.createOscillator(), gain = context.createGain(), f = context.createBiquadFilter()
      osc.type = 'sawtooth'; osc.frequency.setValueAtTime(90, now); osc.frequency.exponentialRampToValueAtTime(640, now + .5)
      f.type = 'lowpass'; f.frequency.setValueAtTime(300, now); f.frequency.exponentialRampToValueAtTime(3200, now + .45)
      gain.gain.setValueAtTime(.0001, now); gain.gain.exponentialRampToValueAtTime(.09, now + .2); gain.gain.exponentialRampToValueAtTime(.0001, now + .8)
      osc.connect(f); f.connect(gain); gain.connect(master); osc.start(now); osc.stop(now + .85)
      osc.onended = () => { osc.disconnect(); f.disconnect(); gain.disconnect() }
    } else if (kind === 'pop') {
      const w = look === 'retro' ? 'square' : 'triangle'; tone(660, now, .12, .08, w); tone(990, now + .04, .14, .06, w)
    } else if (kind === 'flip') {
      tone(520, now, .08, .05, 'triangle'); tone(780, now + .03, .1, .04, 'sine')
    } else if (kind === 'coin') {
      tone(988, now, .08, .09, 'square'); tone(1319, now + .07, .3, .08, 'square')
    } else if (kind === 'break') {
      const len = Math.floor(context.sampleRate * .18), buf = context.createBuffer(1, len, context.sampleRate), d = buf.getChannelData(0)
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2) * (i % 300 < 150 ? 1 : .4)
      const src = context.createBufferSource(), g = context.createGain(); src.buffer = buf; g.gain.value = .25; src.connect(g); g.connect(master); src.start(now); src.onended = () => { src.disconnect(); g.disconnect() }
    } else if (kind === 'pipe') {
      const osc = context.createOscillator(), g = context.createGain(); osc.type = 'square'
      osc.frequency.setValueAtTime(440, now); osc.frequency.exponentialRampToValueAtTime(110, now + .5)
      g.gain.setValueAtTime(.06, now); g.gain.exponentialRampToValueAtTime(.0001, now + .55); osc.connect(g); g.connect(master); osc.start(now); osc.stop(now + .6); osc.onended = () => { osc.disconnect(); g.disconnect() }
    } else if (kind === 'lift') {
      tone(784, now, .9, .08, 'sine'); tone(1046.5, now + .25, 1.1, .07, 'sine')
    } else if (kind === 'egg') {
      tone(880, now, .25, .12, 'sine'); tone(1318.5, now + .09, .4, .1, 'sine')
    }
  }
  function dispose() {
    drone.forEach((osc) => osc.stop())
    context?.close(); drone = []; context = null
  }
  return { start, stop, step, cue, hover, setStyle, dispose }
}
