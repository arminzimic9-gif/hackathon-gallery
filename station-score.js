// Original procedural score for Hackathon Station.
//
// The station ships without recorded music, so the whole soundtrack is
// synthesised at runtime: a handful of persistent voices retuned by a chord
// progression for each place in the journey, plus one-shot plucks and bells from
// a short lookahead scheduler. No audio files, no network requests, and the
// supplied package keeps its own effects (blaster, ceremony fanfare) untouched.

const CEILING = 0.45;        // master gain at volume 1.0
const LOOKAHEAD = 0.45;      // seconds of music kept scheduled ahead
const TICK_MS = 90;          // scheduler wake-up
const ROOT = 55;             // A1
const DEFAULT_VOLUME = 0.6;

// Chords are semitone offsets from ROOT: [bass, ...four pad voices].
export const CHORDS = {
  Am: [0, 12, 15, 19, 24],
  Bb: [1, 13, 17, 22, 25],
  C: [3, 15, 19, 24, 27],
  Dm: [5, 17, 20, 24, 29],
  Em: [7, 19, 22, 26, 31],
  F: [-4, 8, 12, 16, 20],
  G: [-2, 10, 14, 19, 22],
};

/**
 * One spec per place in the journey. `pulseBeats` are the eighth-note positions
 * (0–7) inside a bar that get a pluck, so a mood's rhythm is explicit data.
 */
export const MOODS = {
  intro: { bpm: 58, progression: ['Am', 'F', 'C', 'G'], wave: 'sawtooth', cutoff: 620, reverb: 0.62, pulseBeats: [], layers: { pad: 0.52, bass: 0.34, pulse: 0, bell: 0.3, noise: 0.05 } },
  hangar: { bpm: 74, progression: ['Am', 'Am', 'F', 'G'], wave: 'triangle', cutoff: 900, reverb: 0.4, pulseBeats: [0, 3, 6], layers: { pad: 0.34, bass: 0.42, pulse: 0.18, bell: 0.08, noise: 0.1 } },
  flight: { bpm: 138, progression: ['Dm', 'Bb', 'Am', 'G'], wave: 'sawtooth', cutoff: 1800, reverb: 0.22, pulseBeats: [0, 2, 4, 6, 7], layers: { pad: 0.24, bass: 0.46, pulse: 0.34, bell: 0, noise: 0.26 } },
  hyper: { bpm: 158, progression: ['Bb', 'F', 'C', 'G'], wave: 'sawtooth', cutoff: 2600, reverb: 0.3, pulseBeats: [0, 1, 2, 3, 4, 5, 6, 7], layers: { pad: 0.3, bass: 0.4, pulse: 0.4, bell: 0.1, noise: 0.44 } },
  dock: { bpm: 76, progression: ['F', 'C', 'Am', 'Am'], wave: 'triangle', cutoff: 800, reverb: 0.5, pulseBeats: [0, 4], layers: { pad: 0.44, bass: 0.3, pulse: 0.08, bell: 0.24, noise: 0.08 } },
  gallery: { bpm: 62, progression: ['C', 'Am', 'F', 'G'], wave: 'triangle', cutoff: 1100, reverb: 0.58, pulseBeats: [0, 5], layers: { pad: 0.42, bass: 0.22, pulse: 0.13, bell: 0.26, noise: 0 } },
  bridge: { bpm: 68, progression: ['Am', 'Em', 'F', 'C'], wave: 'sawtooth', cutoff: 1300, reverb: 0.55, pulseBeats: [0, 6], layers: { pad: 0.4, bass: 0.24, pulse: 0.11, bell: 0.3, noise: 0.03 } },
  ceremony: { bpm: 92, progression: ['F', 'G', 'Am', 'C'], wave: 'sawtooth', cutoff: 1600, reverb: 0.5, pulseBeats: [0, 2, 4, 6], layers: { pad: 0.48, bass: 0.4, pulse: 0.24, bell: 0.28, noise: 0.04 } },
};

export const MOOD_ORDER = Object.keys(MOODS);

const semitone = (offset) => ROOT * Math.pow(2, offset / 12);

/** Small deterministic RNG so a visit keeps its own motif without drifting. */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Name the mood a scene wrapper belongs to. The supplied space scene reports its
 * own mode; rooms are recognised by the empties their GLB carries, so nothing
 * here depends on supplied code being edited.
 */
export function classifyScene(wrapper) {
  if (!wrapper) return null;
  if (typeof wrapper.mode === 'string') {
    if (wrapper.mode === 'hyper') return 'hyper';
    if (wrapper.mode === 'flight') return 'flight';
    if (wrapper.mode === 'dock' || wrapper.mode === 'done') return 'dock';
    return 'intro';
  }
  const scene = wrapper.scene;
  if (!scene || typeof scene.getObjectByName !== 'function') return null;
  if (scene.getObjectByName('PLACE_1') || scene.getObjectByName('OCULUS')) return 'ceremony';
  if (scene.getObjectByName('WINNER_SLOT_1') || scene.getObjectByName('LIFT_ARRIVAL')) return 'bridge';
  if (scene.getObjectByName('DOOR_BRIDGE_LIFT')) return 'gallery';
  if (scene.getObjectByName('DOOR_TO_CORRIDOR') || scene.getObjectByName('FORCEFIELD')) return 'hangar';
  return null;
}

export function readAudioSettings(raw) {
  let saved = null;
  try { saved = raw == null ? null : typeof raw === 'string' ? JSON.parse(raw) : raw; } catch { saved = null; }
  const volume = typeof saved?.volume === 'number' ? Math.min(1, Math.max(0, saved.volume)) : DEFAULT_VOLUME;
  return { volume, muted: !!saved?.muted };
}

function impulse(context, seconds = 2.6, decay = 2.4) {
  const length = Math.max(1, Math.floor(context.sampleRate * seconds));
  const buffer = context.createBuffer(2, length, context.sampleRate);
  for (let channel = 0; channel < 2; channel++) {
    const data = buffer.getChannelData(channel);
    for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
  }
  return buffer;
}

function noiseBuffer(context, seconds = 2) {
  const length = Math.floor(context.sampleRate * seconds);
  const buffer = context.createBuffer(1, length, context.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
  return buffer;
}

export function createScore({ storage = null, onError = () => {}, seed = 20261011 } = {}) {
  const settings = readAudioSettings(storage?.getItem?.('hs.audio'));
  const rng = mulberry32(seed >>> 0);
  let ctx = null, master = null, music = null, send = null, verb = null;
  let ducked = false;
  let padFilter = null, padGain = null, pad = [], padLfo = null;
  let bassOsc = null, bassGain = null;
  let noiseSrc = null, noiseFilter = null, noiseGain = null;
  let mood = 'intro', barIndex = -1, beat = 0, nextTime = 0, timer = 0, started = false;
  let listeners = [];

  const persist = () => {
    try { storage?.setItem?.('hs.audio', JSON.stringify({ muted: settings.muted, volume: settings.volume })); }
    catch (error) { onError(error); }
  };

  function build() {
    const Ctor = window.AudioContext || window.webkitAudioContext;
    if (!Ctor) return null;
    if (!ctx) {
      try { ctx = new Ctor(); } catch (error) { onError(error); return null; }
      master = ctx.createGain();
      master.gain.value = settings.muted || ducked ? 0 : settings.volume * CEILING;
      const limiter = ctx.createDynamicsCompressor();
      limiter.threshold.value = -16; limiter.knee.value = 14; limiter.ratio.value = 8;
      limiter.attack.value = 0.006; limiter.release.value = 0.25;
      master.connect(limiter); limiter.connect(ctx.destination);

      music = ctx.createGain(); music.connect(master);
      verb = ctx.createConvolver(); verb.buffer = impulse(ctx);
      const verbReturn = ctx.createGain(); verbReturn.gain.value = 0.85;
      verb.connect(verbReturn); verbReturn.connect(master);
      send = ctx.createGain(); send.gain.value = MOODS[mood].reverb; send.connect(verb);

      padFilter = ctx.createBiquadFilter(); padFilter.type = 'lowpass';
      padFilter.frequency.value = MOODS[mood].cutoff; padFilter.Q.value = 0.7;
      padGain = ctx.createGain(); padGain.gain.value = 0;
      padFilter.connect(padGain); padGain.connect(music); padGain.connect(send);
      padLfo = ctx.createOscillator(); padLfo.frequency.value = 0.045;
      const lfoDepth = ctx.createGain(); lfoDepth.gain.value = 220;
      padLfo.connect(lfoDepth); lfoDepth.connect(padFilter.frequency); padLfo.start();
      pad = [0, 1, 2, 3].map((i) => {
        const osc = ctx.createOscillator();
        osc.type = 'sawtooth'; osc.detune.value = (i - 1.5) * 8;
        const voice = ctx.createGain(); voice.gain.value = 0.3;
        osc.connect(voice); voice.connect(padFilter); osc.start();
        return osc;
      });

      const bassFilter = ctx.createBiquadFilter();
      bassFilter.type = 'lowpass'; bassFilter.frequency.value = 260;
      bassOsc = ctx.createOscillator(); bassOsc.type = 'sine';
      bassGain = ctx.createGain(); bassGain.gain.value = 0;
      bassOsc.connect(bassFilter); bassFilter.connect(bassGain);
      bassGain.connect(music); bassGain.connect(send); bassOsc.start();

      noiseFilter = ctx.createBiquadFilter();
      noiseFilter.type = 'bandpass'; noiseFilter.frequency.value = 700; noiseFilter.Q.value = 0.8;
      noiseGain = ctx.createGain(); noiseGain.gain.value = 0;
      noiseSrc = ctx.createBufferSource(); noiseSrc.buffer = noiseBuffer(ctx); noiseSrc.loop = true;
      noiseSrc.connect(noiseFilter); noiseFilter.connect(noiseGain);
      noiseGain.connect(music); noiseGain.connect(send); noiseSrc.start();
    }
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    return ctx;
  }

  function applyLayers(spec, at, glide = 0.9) {
    padGain.gain.setTargetAtTime(spec.layers.pad * 0.09, at, glide);
    bassGain.gain.setTargetAtTime(spec.layers.bass * 0.3, at, glide);
    noiseGain.gain.setTargetAtTime(spec.layers.noise * 0.1, at, glide);
    padFilter.frequency.setTargetAtTime(spec.cutoff, at, glide);
    noiseFilter.frequency.setTargetAtTime(Math.max(240, spec.cutoff * 0.7), at, glide);
    send.gain.setTargetAtTime(spec.reverb, at, glide);
    pad.forEach((osc) => { if (osc.type !== spec.wave) osc.type = spec.wave; });
  }

  function bell(chord, at, level) {
    [chord[chord.length - 1] + 12, chord[chord.length - 2] + 24].forEach((semi, i) => {
      const osc = ctx.createOscillator(), gain = ctx.createGain();
      osc.type = 'sine'; osc.frequency.value = semitone(semi);
      const peak = level * (i ? 0.05 : 0.11);
      gain.gain.setValueAtTime(0.0001, at);
      gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), at + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, at + 3.2);
      osc.connect(gain); gain.connect(music); gain.connect(send);
      osc.start(at); osc.stop(at + 3.3);
      osc.onended = () => { osc.disconnect(); gain.disconnect(); };
    });
  }

  function pluck(spec, chord, at) {
    const voices = chord.slice(1);
    const pick = voices[Math.floor(rng() * voices.length)] + (rng() < 0.35 ? 12 : 0);
    const osc = ctx.createOscillator(), gain = ctx.createGain(), filter = ctx.createBiquadFilter();
    osc.type = spec.wave === 'sawtooth' ? 'square' : 'triangle';
    osc.frequency.value = semitone(pick + 12);
    filter.type = 'lowpass'; filter.frequency.value = Math.min(7000, spec.cutoff * 1.7);
    const peak = spec.layers.pulse * 0.16 * (0.65 + rng() * 0.5);
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0004, peak), at + 0.014);
    gain.gain.exponentialRampToValueAtTime(0.0002, at + 0.32);
    osc.connect(filter); filter.connect(gain); gain.connect(music); gain.connect(send);
    osc.start(at); osc.stop(at + 0.4);
    osc.onended = () => { osc.disconnect(); filter.disconnect(); gain.disconnect(); };
  }

  /** A short filtered sweep marks the hyperspace jump and the docking settle. */
  function sweep(at, seconds, up) {
    const from = up ? 300 : 2400, to = up ? 5200 : 260;
    noiseFilter.frequency.cancelScheduledValues(at);
    noiseFilter.frequency.setValueAtTime(from, at);
    noiseFilter.frequency.exponentialRampToValueAtTime(to, at + seconds);
    noiseGain.gain.cancelScheduledValues(at);
    noiseGain.gain.setValueAtTime(Math.max(0.0001, noiseGain.gain.value), at);
    noiseGain.gain.linearRampToValueAtTime(up ? 0.2 : 0.12, at + seconds * 0.6);
    noiseGain.gain.setTargetAtTime(MOODS[mood].layers.noise * 0.1, at + seconds * 0.7, 0.5);
  }

  function newBar(spec, at) {
    barIndex = (barIndex + 1) % spec.progression.length;
    const chord = CHORDS[spec.progression[barIndex]] || CHORDS.Am;
    chord.slice(1, 5).forEach((semi, i) => pad[i]?.frequency.setTargetAtTime(semitone(semi), at, 0.35));
    bassOsc.frequency.setTargetAtTime(semitone(chord[0]), at, 0.22);
    if (spec.layers.bell > 0 && barIndex % 2 === 0) bell(chord, at + 0.02, spec.layers.bell);
  }

  function tick() {
    if (!ctx || settings.muted || ctx.state !== 'running') return;
    if (listeners.length) release();   // the browser is letting us play
    const spec = MOODS[mood];
    while (nextTime < ctx.currentTime + LOOKAHEAD) {
      const position = beat % 8;
      if (position === 0) newBar(spec, nextTime);
      if (spec.pulseBeats.includes(position)) {
        const chord = CHORDS[spec.progression[barIndex < 0 ? 0 : barIndex]] || CHORDS.Am;
        pluck(spec, chord, nextTime);
      }
      nextTime += 60 / spec.bpm / 2;
      beat++;
    }
  }

  /**
   * Bring the transport up and report whether it is actually sounding. A context
   * built before a visitor gesture stays suspended, so this is called both at
   * mount and from the gesture listeners until the browser lets it run.
   */
  function start() {
    if (settings.muted) return false;
    if (!build()) return false;
    if (!started) {
      started = true;
      beat = 0; barIndex = -1;
      nextTime = ctx.currentTime + 0.1;
      applyLayers(MOODS[mood], ctx.currentTime, 1.4);
      timer = setInterval(tick, TICK_MS);
    }
    tick();
    return ctx.state === 'running';
  }

  /** Browsers only allow audio after a gesture; arm one and keep it cheap. */
  function arm() {
    if (listeners.length) return;
    const unlock = () => { if (start()) release(); };
    listeners = [['pointerdown', unlock], ['keydown', unlock], ['touchend', unlock]].map(([type, fn]) => {
      window.addEventListener(type, fn, { capture: true, passive: true });
      return [type, fn];
    });
  }
  function release() {
    listeners.forEach(([type, fn]) => window.removeEventListener(type, fn, { capture: true }));
    listeners = [];
  }

  function setMood(name) {
    if (!MOODS[name] || name === mood) return;
    const previous = mood;
    mood = name;
    if (!ctx || !started) return;
    const spec = MOODS[name], at = ctx.currentTime + 0.03;
    beat = 0; barIndex = -1;
    nextTime = Math.max(nextTime, at);
    applyLayers(spec, at, name === 'hyper' || previous === 'hyper' ? 0.25 : 0.9);
    newBar(spec, at);
    if (name === 'hyper') sweep(at, 1.8, true);
    if (name === 'dock') sweep(at, 2.4, false);
  }

  function setVolume(value) {
    settings.volume = Math.min(1, Math.max(0, Number(value) || 0));
    persist();
    if (ctx && !settings.muted && !ducked) master.gain.setTargetAtTime(settings.volume * CEILING, ctx.currentTime, 0.05);
  }

  function setMuted(muted) {
    settings.muted = !!muted;
    persist();
    if (settings.muted) {
      if (ctx) master.gain.setTargetAtTime(0, ctx.currentTime, 0.06);
      release();
      return false;
    }
    if (!started) { arm(); return false; }
    if (!ducked) master.gain.setTargetAtTime(settings.volume * CEILING, ctx.currentTime, 0.08);
    nextTime = Math.max(nextTime, ctx.currentTime + 0.05);
    return start();
  }

  /** Silence the score without touching the saved setting (e.g. while a video plays). */
  function duck(on) {
    ducked = !!on;
    if (!ctx) return;
    master.gain.setTargetAtTime(ducked || settings.muted ? 0 : settings.volume * CEILING, ctx.currentTime, 0.12);
  }

  function dispose() {
    release();
    if (timer) clearInterval(timer);
    timer = 0; started = false;
    if (ctx) {
      try {
        pad.forEach((osc) => osc.stop());
        padLfo?.stop(); bassOsc?.stop(); noiseSrc?.stop();
        ctx.close();
      } catch { /* already torn down */ }
    }
    ctx = null; pad = [];
  }

  // Only arm: building the context here would create it suspended and warn in
  // the console. The first gesture on the page (PRESS START at the latest) both
  // builds and resumes it, which is what browsers require anyway.
  arm();

  return {
    start, arm, setMood, setVolume, duck, dispose,
    get mood() { return mood; },
    get volume() { return settings.volume; },
    get muted() { return settings.muted; },
    get running() { return !!ctx && started && ctx.state === 'running' && !settings.muted; },
    get state() { return ctx ? ctx.state : 'none'; },
    get contextTime() { return ctx ? ctx.currentTime : 0; },
    setMuted,
    toggleMute() { return setMuted(!settings.muted); },
  };
}

/**
 * Follow the journey: the supplied engine only exposes scene swaps, and the
 * flight scene changes mode in place, so moods come from a light poll of the
 * last wrapper the engine was given.
 */
export function installStationScore(station, score, intervalMs = 250) {
  const engine = station.engine;
  const originalSetScene = engine.setScene;
  let current = null;
  let mood = 'intro';
  engine.setScene = (wrapper) => { originalSetScene(wrapper); current = wrapper; };
  const timer = setInterval(() => {
    const next = classifyScene(current) || 'intro';
    if (next === mood) return;
    mood = next;
    score.setMood(next);
  }, intervalMs);
  return {
    dispose() {
      clearInterval(timer);
      if (engine.setScene !== originalSetScene) engine.setScene = originalSetScene;
    },
  };
}
