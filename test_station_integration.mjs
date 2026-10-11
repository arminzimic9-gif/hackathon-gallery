import test from 'node:test';
import assert from 'node:assert/strict';
import { preloadStationStorage, stationCollection, flightScore } from './station-integration.js';

test('device values preload before synchronous reads and writes preserve order', async () => {
  const writes = [], errors = [];
  const adapter = await preloadStationStorage(async (_, arg) => {
    if (arg.operation === 'get') return arg.key === 'hs.xp' ? '42' : null;
    if (arg.value === '43') await new Promise(r => setTimeout(r, 20));
    writes.push([arg.key, arg.value]);
  }, e => errors.push(e));
  assert.equal(adapter.getItem('hs.xp'), '42');
  assert.equal(adapter.getItem('hs.pilot'), null);
  adapter.setItem('hs.xp', '43'); adapter.setItem('hs.xp', '44');
  assert.equal(adapter.getItem('hs.xp'), '44');
  await adapter.flush();
  assert.deepEqual(writes, [['hs.xp', '43'], ['hs.xp', '44']]);
  assert.deepEqual(errors, []);
});

test('failed preload never turns unavailable preferences into a writable empty visit', async () => {
  await assert.rejects(preloadStationStorage(async () => { throw Error('unavailable'); }, () => {}), /unavailable/);
});

test('failed write reports visibly and does not block newer writes', async () => {
  const errors = [], writes = [];
  const adapter = await preloadStationStorage(async (_, a) => {
    if (a.operation === 'get') return null;
    if (a.value === '1') throw Error('save failed');
    writes.push(a.value);
  }, e => errors.push(e.message));
  adapter.setItem('hs.xp', '1'); adapter.setItem('hs.xp', '2'); await adapter.flush();
  assert.deepEqual(errors, ['save failed']); assert.deepEqual(writes, ['2']);
});

test('curation maps authenticated images and preserves missing winner places without inventing winners', async () => {
  const fetched = [];
  const state = { art: [
    { id: 'sample', title: 'Sample', author: 'Demo', caption: '', placeholder: true, winner_rank: 1 },
    { id: 'real', title: 'Real work', author: 'Artist', caption: 'Caption', placeholder: false, winner_rank: 2 },
  ] };
  const { art, winners } = await stationCollection(state, async id => { fetched.push(id); return 'data:image/png;base64,fixture'; });
  assert.deepEqual(fetched, ['real']); assert.equal(art[1].url, 'data:image/png;base64,fixture');
  assert.equal(art[0].sample, true); assert.equal(winners[0], null);
  assert.equal(winners[1].place, 2); assert.equal(winners[1].id, 'real'); assert.equal(winners[2], null);
});

test('failed real artwork fetch never silently replaces it with a demo poster', async () => {
  await assert.rejects(stationCollection({ art: [{ id: 'real', placeholder: false }] }, async () => { throw Error('image unavailable'); }), /image unavailable/);
});

test('a flight run carries colours only, because the board name is the verified participant', () => {
  assert.deepEqual(flightScore({ score: 350, pilot: { callsign: 'ABCDEFGHIJKLMN', suit: 1, visor: 0 } }, ['#ffffff', '#ff8a2a'], ['#6fd3ff']), {
    game: 'flight', score: 350, suit_color: '#ff8a2a', visor_color: '#6fd3ff',
  });
});

import { CHORDS, MOODS, classifyScene, mulberry32, readAudioSettings } from './station-score.js';

const sceneStub = (...names) => ({ scene: { getObjectByName: (n) => names.includes(n) ? {} : null } });

test('the score follows the supplied flight modes and recognises every room by its own markers', () => {
  assert.equal(classifyScene(null), null);
  assert.equal(classifyScene({ mode: 'intro' }), 'intro');
  assert.equal(classifyScene({ mode: 'hyper' }), 'hyper');
  assert.equal(classifyScene({ mode: 'flight' }), 'flight');
  assert.equal(classifyScene({ mode: 'dock' }), 'dock');
  assert.equal(classifyScene({ mode: 'done' }), 'dock');
  assert.equal(classifyScene(sceneStub('PLACE_1', 'SPOT_00')), 'ceremony');
  assert.equal(classifyScene(sceneStub('WINNER_SLOT_1', 'LIFT_ARRIVAL')), 'bridge');
  assert.equal(classifyScene(sceneStub('DOOR_BRIDGE_LIFT', 'SPAWN')), 'gallery');
  assert.equal(classifyScene(sceneStub('DOOR_TO_CORRIDOR', 'FORCEFIELD', 'SPAWN')), 'hangar');
  assert.equal(classifyScene({ scene: {} }), null);
});

test('every mood is playable data: known chords, sane layers and a rhythm inside the bar', () => {
  for (const [name, mood] of Object.entries(MOODS)) {
    assert.ok(mood.progression.length >= 3, name);
    for (const chord of mood.progression) {
      assert.ok(CHORDS[chord], name + ' uses an undefined chord ' + chord);
      assert.equal(CHORDS[chord].length, 5, chord + ' voices one bass plus four pad notes');
    }
    assert.ok(mood.bpm > 40 && mood.bpm < 200, name);
    for (const [layer, level] of Object.entries(mood.layers)) {
      assert.ok(['pad', 'bass', 'pulse', 'bell', 'noise'].includes(layer), name + ' has an unscored layer ' + layer);
      assert.ok(level >= 0 && level <= 1, name + '.' + layer);
    }
    assert.ok(mood.pulseBeats.every((beat) => Number.isInteger(beat) && beat >= 0 && beat < 8), name);
    assert.ok(mood.cutoff > 100 && mood.reverb >= 0 && mood.reverb <= 1, name);
  }
  // The journey must actually change character, not replay one mood everywhere.
  assert.ok(MOODS.flight.bpm > MOODS.gallery.bpm * 1.5);
  assert.ok(MOODS.flight.layers.noise > MOODS.gallery.layers.noise);
});

test('saved audio settings are clamped and a corrupt save falls back to the default', () => {
  assert.deepEqual(readAudioSettings(null), { volume: 0.6, muted: false });
  assert.deepEqual(readAudioSettings('not json'), { volume: 0.6, muted: false });
  assert.deepEqual(readAudioSettings('{"volume":3,"muted":true}'), { volume: 1, muted: true });
  assert.deepEqual(readAudioSettings('{"volume":-2}'), { volume: 0, muted: false });
  assert.deepEqual(readAudioSettings('{"volume":0.25}'), { volume: 0.25, muted: false });
});

test('the motif generator is deterministic per visit and stays in range', () => {
  const a = mulberry32(7), b = mulberry32(7), c = mulberry32(8);
  const first = [a(), a(), a()];
  assert.deepEqual(first, [b(), b(), b()]);
  assert.notDeepEqual(first, [c(), c(), c()]);
  assert.ok(first.every((value) => value >= 0 && value < 1));
});

import { PUBLIC_BASE, createVisitorApi } from './station-service.js';

function stubFetch(handler) {
  const previous = globalThis.fetch, calls = [];
  globalThis.fetch = async (url, options) => { calls.push(url); return handler(url, options); };
  return { calls, restore: () => { globalThis.fetch = previous; } };
}

test('a published visitor falls back to the public lane once and never retries the curator lane', async (t) => {
  const { calls, restore } = stubFetch(async (url) => url.startsWith('/api/apps/')
    ? { ok: false, status: 401, json: async () => ({ detail: 'Valid public app token required.' }) }
    : { ok: true, status: 200, json: async () => ({ art: [], lane: 'public' }) });
  t.after(restore);
  const api = createVisitorApi(12, 'public-app-token');
  assert.equal((await api.state()).lane, 'public');
  assert.equal(api.canCurate, false);
  await api.scores();
  assert.deepEqual(calls, ['/api/apps/12/service/state', PUBLIC_BASE + 'gallery', PUBLIC_BASE + 'scores']);
});

test("the owner's shell keeps the curator lane and its media, so curation stays available", async (t) => {
  const { calls, restore } = stubFetch(async (url) => url.startsWith('/api/apps/')
    ? { ok: true, status: 200, json: async () => ({ art: [], lane: 'curator' }) }
    : { ok: true, status: 200, json: async () => ({ lane: 'public' }) });
  t.after(restore);
  const api = createVisitorApi(12, 'app-token');
  assert.equal((await api.state()).lane, 'curator');
  assert.equal(api.canCurate, true);
  await api.scores();
  assert.deepEqual(calls, ['/api/apps/12/service/state', '/api/apps/12/service/scores']);
});

test('a curator-lane failure after a good read is reported, not silently downgraded', async (t) => {
  let first = true;
  const { restore } = stubFetch(async (url) => {
    if (!url.startsWith('/api/apps/')) return { ok: true, status: 200, json: async () => ({ lane: 'public' }) };
    if (first) { first = false; return { ok: true, status: 200, json: async () => ({ art: [] }) }; }
    return { ok: false, status: 500, json: async () => ({ error: 'Gallery could not complete this request.' }) };
  });
  t.after(restore);
  const api = createVisitorApi(12, 'app-token');
  await api.state();
  await assert.rejects(api.scores(), /could not complete/i);
});

import { installStationImageLoader } from './station-image-loader.js';

test('image compatibility configures each loader once and restores its original lifecycle', () => {
  class Loader {
    callbacks = [];
    register(cb) { this.callbacks.push(cb); return this; }
    unregister(cb) { this.callbacks = this.callbacks.filter(x => x !== cb); return this; }
    parse(options, onParsed) {
      const parser = { options };
      this.callbacks.forEach(cb => assert.ok(cb(parser).name));
      onParsed(parser); return 'original-result';
    }
  }
  class Images {
    constructor(manager) { this.manager = manager; }
    setCrossOrigin(v) { this.crossOrigin = v; return this; }
    setRequestHeader(v) { this.requestHeader = v; return this; }
  }
  const original = Loader.prototype.parse;
  const releaseA = installStationImageLoader(Loader, Images);
  const releaseB = installStationImageLoader(Loader, Images);
  const a = new Loader(), b = new Loader(), manager = {}, headers = { test: 'scoped' };
  const options = { manager, requestHeader: headers, crossOrigin: 'anonymous' };
  const verify = p => {
    assert.ok(p.textureLoader instanceof Images);
    assert.equal(p.textureLoader.manager, manager);
    assert.equal(p.textureLoader.crossOrigin, 'anonymous');
    assert.equal(p.textureLoader.requestHeader, headers);
  };
  assert.equal(a.parse(options, verify), 'original-result');
  a.parse(options, verify); b.parse(options, verify);
  assert.equal(a.callbacks.length, 1); assert.equal(b.callbacks.length, 1);
  releaseA(); releaseA();
  assert.notEqual(Loader.prototype.parse, original);
  releaseB();
  assert.equal(Loader.prototype.parse, original);
  assert.equal(a.callbacks.length, 0); assert.equal(b.callbacks.length, 0);
});
