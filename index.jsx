import React, { useEffect, useRef, useState } from 'react';
import { mountStation } from './src/main.js';
import { SUITS, VISORS } from './src/pilot.js';
import { STATION_CSS } from './station-css.js';
import { preloadStationStorage, stationCollection, flightScore } from './station-integration.js';
import { createVisitorApi, requestGallery } from './station-service.js';
import Admin from './Admin.jsx';
import { TopPilots } from './station-tools.jsx';
import { ParticipantPanel, SubmitPanel, PARTICIPANT_CSS } from './station-participant.jsx';
import { restoreParticipant, signInParticipant, submitFlightScore, submitWork } from './station-participant.js';
import { createScore, installStationScore } from './station-score.js';
import { TOOLS_CSS } from './station-tools-style.js';
import { CINEMATIC_CSS } from './station-cinematic-style.js';
import { WORLD_DETAILS_CSS, installStationWorldDetails } from './station-world-details.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { TextureLoader } from 'three';
import { installStationImageLoader } from './station-image-loader.js';
import { installStationPresence, PRESENCE_CSS } from './station-presence.js';
import { TrailerPlayer, TRAILER_CSS, TRAILER_FILE, installTrailerButton } from './station-trailer.jsx';

function About({ onClose }) {
  return <div className="st-modal-back" role="dialog" aria-modal="true" aria-label="About Hackathon Station"><div className="st-modal">
    <button className="st-close" onClick={onClose} aria-label="Close About">×</button>
    <h2>HACKATHON STATION</h2>
    <p>Concept, art direction and build: <b>Armin Zimić</b>.</p>
    <p>Rooms, ship and station: modelled and light-baked in <b>Blender</b> from code.</p>
    <p>three.js code: written with AI assistance (<b>Claude Code</b>).</p>
    <p>Möbius integration: <b>ChatGPT Astra</b> (credited as <b>GPT-6-Astra</b>).</p>
    <p>Soundtrack: an original score synthesised live for this station.</p>
    <p>Official trailer: <b>Via Creativa Studio</b> for Möbius. Trailer music: <b>Gregor Quendel</b>, CC BY 4.0.</p>
    <p>Pilot characters: “Ultimate Space Kit” by <b>Quaternius</b>, CC0 1.0. Library: three.js (MIT).</p>
  </div></div>;
}

export default function App({ appId, token }) {
  const root = useRef(null), station = useRef(null), storage = useRef(null), tools = useRef(null);
  const visitor = useRef(null), track = useRef(null), signed = useRef(null), sharedRoom = useRef(null);
  const [gallery, setGallery] = useState(null), [scores, setScores] = useState({});
  const [ready, setReady] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState('');
  const [overlay, setOverlay] = useState(null), [changed, setChanged] = useState(false);
  const [participant, setParticipant] = useState(null), [canCurate, setCanCurate] = useState(false);
  const [music, setMusic] = useState({ on: true, volume: 0.6 }), [run, setRun] = useState(null);
  const [trailer, setTrailer] = useState(false);
  const [presence, setPresence] = useState({ enabled: false, phase: 'off', room: null, online: 0 });
  const report = (e, source) => {
    setNotice(e.message);
    window.mobius?.signal('error', { message: e.message, source });
  };

  useEffect(() => {
    let disposed = false, handle, details, follow, musicHook, presenceHook, trailerHook;
    const releaseImageLoader = installStationImageLoader(GLTFLoader, TextureLoader);
    window.parent.postMessage({ type: 'moebius:immersive', value: true, appId }, '*');
    async function start() {
      // Guests read the public lane; the owner's shell keeps the curator lane.
      const api = createVisitorApi(appId, token);
      visitor.current = api;
      const [state, adapter] = await Promise.all([
        api.state(),
        preloadStationStorage((...args) => window.mobius.capabilities.invoke(...args), e => report(e, 'device-save')),
      ]);
      if (disposed) return;
      storage.current = adapter; setGallery(state);
      const collection = await stationCollection(state, api.media);
      if (disposed) return;
      const score = createScore({ storage: adapter, onError: e => report(e, 'music') });
      track.current = score;
      setMusic({ on: !score.muted, volume: score.volume });
      handle = await mountStation(root.current, {
        assetUrl: name => `/app-assets/by-id/${appId}/${name}`,
        ...collection, storage: adapter,
        onEvent(type, data) {
          if (type !== 'flight') return;
          const entry = flightScore(data, SUITS, VISORS);
          const who = signed.current;
          // Official results belong to a signed-in participant; a guest's run
          // stays a local personal best rather than an unattributed board row.
          if (!who) { if (!disposed) setRun({ score: data.score, official: false }); return; }
          submitFlightScore(who, entry)
            .then(result => { if (!disposed) { setScores(result.scores); setRun({ score: data.score, official: true, rank: result.rank }); } })
            .catch(e => { if (!disposed) setRun({ score: data.score, official: false, problem: e.message }); });
        },
      });
      if (disposed) { handle.dispose(); score.dispose(); return; }
      details = installStationWorldDetails(handle, root.current, collection.winners);
      musicHook = installStationScore(handle, score);
      presenceHook = installStationPresence(handle, {
        assetUrl: name => `/app-assets/by-id/${appId}/${name}`,
        storage: adapter, onState: next => { if (!disposed) setPresence(next); },
      });
      sharedRoom.current = presenceHook;
      trailerHook = installTrailerButton(root.current, openTrailer);
      station.current = handle; setReady(true); setCanCurate(api.canCurate);
      window.mobius?.signal('app_ready', { item_count: collection.art.length });
      // A saved sign-in is re-checked, so a withdrawn code returns to guest.
      const saved = adapter.getItem('hs.verified');
      follow = restoreParticipant(saved).then(next => {
        if (disposed) return;
        signed.current = next; setParticipant(next);
        if (!next && saved) adapter.setItem('hs.verified', '');
      }).catch(() => {});
    }
    start().catch(e => { if (!disposed) { setError(e.message); window.mobius?.signal('error', { message: e.message, source: 'station-start' }); } });
    return () => {
      disposed = true; station.current = null; sharedRoom.current = null;
      presenceHook?.dispose(); trailerHook?.dispose(); musicHook?.dispose(); details?.dispose(); track.current?.dispose(); track.current = null;
      handle?.dispose(); releaseImageLoader();
      window.parent.postMessage({ type: 'moebius:immersive', value: false, appId }, '*');
    };
  }, [appId, token]);

  useEffect(() => {
    if (!run) return undefined;
    const timer = setTimeout(() => setRun(null), 9000);
    return () => clearTimeout(timer);
  }, [run]);

  async function openOverlay(kind) {
    tools.current.open = false;
    station.current?.player.setEnabled(false);
    setOverlay(kind);
    try {
      if (kind === 'admin') setGallery(await requestGallery(appId, token, 'state'));
      if (kind === 'leaders') setScores((await visitor.current.scores()).scores);
    } catch (e) { report(e, 'station-tools'); }
  }
  function openTrailer() {
    if (tools.current) tools.current.open = false;
    station.current?.player.setEnabled(false);
    // Read the setting at the moment of opening: the trailer follows MUSIC ON/OFF and the slider.
    const score = track.current;
    if (score) setMusic({ on: !score.muted, volume: score.volume });
    setTrailer(true);
  }
  function closeTrailer() {
    setTrailer(false);
    station.current?.player.setEnabled(!!root.current.querySelector('.st-hud'));
  }
  async function closeOverlay() {
    if (changed) {
      await storage.current?.flush();
      // The supplied station has no collection-update API. A fresh document
      // applies curation and disposes all module-level room/texture caches.
      location.reload(); return;
    }
    setOverlay(null);
    station.current?.player.setEnabled(!!root.current.querySelector('.st-hud'));
  }
  async function signIn(code, name) {
    const next = await signInParticipant(code, name);
    signed.current = next; setParticipant(next);
    storage.current?.setItem('hs.verified', JSON.stringify(next));
    await storage.current?.flush();
    resume();
  }
  async function signOut() {
    signed.current = null; setParticipant(null);
    storage.current?.setItem('hs.verified', '');
    await storage.current?.flush();
    resume();
  }
  function toggleMusic() {
    const score = track.current; if (!score) return;
    score.toggleMute(); score.arm();
    setMusic({ on: !score.muted, volume: score.volume });
  }
  function changeVolume(percent) {
    const score = track.current; if (!score) return;
    score.setVolume(percent / 100);
    setMusic(current => ({ ...current, volume: score.volume }));
  }
  function togglePresence() { sharedRoom.current?.setEnabled(!presence.enabled); }
  /** Panels never re-enable walking during the intro, flight or ceremony fade. */
  function resume() {
    setOverlay(null);
    station.current?.player.setEnabled(!!root.current.querySelector('.st-hud'));
  }
  function blockGameKeys(e) { e.stopPropagation(); }

  return <>
    <style>{STATION_CSS}</style><style>{CINEMATIC_CSS}</style><style>{TOOLS_CSS}</style>
    <style>{WORLD_DETAILS_CSS}</style><style>{PARTICIPANT_CSS}</style><style>{PRESENCE_CSS}</style><style>{TRAILER_CSS}</style>
    <div id="station-root" ref={root}/>
    {!ready && <div className="hs-status" role={error ? 'alert' : 'status'}>
      <b>HACKATHON STATION</b><span>{error || 'Preparing the station…'}</span>
      {error && <button onClick={() => location.reload()}>RETRY</button>}
    </div>}
    {ready && <details className="hs-tools" ref={tools} onKeyDown={blockGameKeys} onKeyUp={blockGameKeys}>
      <summary>STATION TOOLS</summary><nav aria-label="Station tools">
        <div className="hs-sound">
          <button aria-pressed={music.on} onClick={toggleMusic}>{music.on ? 'MUSIC ON' : 'MUSIC OFF'}</button>
          <input type="range" min="0" max="100" step="5" value={Math.round(music.volume * 100)}
            aria-label="Music volume" onChange={e => changeVolume(Number(e.target.value))}/>
        </div>
        <button className="hs-trailer-tool" onClick={openTrailer}>► WATCH TRAILER</button>
        <button aria-pressed={presence.enabled} onClick={togglePresence}>
          {presence.enabled ? 'LEAVE SHARED ROOM' : 'SEE OTHER PILOTS'}
        </button>
        <div className="hs-presence-help">Optional · shares your callsign and position only while joined. Updates about every 8 seconds; callsigns are not verified.</div>
        <button onClick={() => openOverlay('submit')}>SUBMIT WORK</button>
        <button onClick={() => openOverlay(participant ? 'participant' : 'signin')}>{participant ? 'PARTICIPANT' : 'SIGN IN'}</button>
        {canCurate && <button onClick={() => openOverlay('admin')}>CURATE</button>}
        <button onClick={() => openOverlay('leaders')}>TOP PILOTS</button>
        <button onClick={() => openOverlay('about')}>ABOUT</button>
      </nav>
    </details>}
    {ready && presence.enabled && <div className="hs-presence-chip" role="status">
      {presence.phase === 'connected' ? `${presence.online} OTHER PILOT${presence.online === 1 ? '' : 'S'} · ${presence.room?.toUpperCase()}`
        : presence.phase === 'unavailable' ? 'SHARED ROOM UNAVAILABLE'
        : presence.phase === 'waiting' ? 'SHARED ROOM · ENTER A ROOM'
        : 'CONNECTING TO SHARED ROOM'}
    </div>}
    {ready && run && <div className="hs-run" role="status">
      <b>RUN LOGGED · {run.score} PTS</b>
      <span>{run.official ? 'On the official Top Pilots board · rank ' + run.rank
        : run.problem || 'Sign in with a participant code to enter the official Top Pilots board.'}</span>
      {!run.official && <button onClick={() => openOverlay('signin')}>SIGN IN</button>}
    </div>}
    {overlay && <div className="hs-overlay" onKeyDown={blockGameKeys} onKeyUp={blockGameKeys}>
      {overlay === 'admin' && canCurate && <Admin appId={appId} token={token} state={gallery} onState={s => { setGallery(s); setChanged(true); }} onClose={closeOverlay}/>}
      {overlay === 'leaders' && <TopPilots scores={scores} onClose={closeOverlay}/>}
      {overlay === 'about' && <About onClose={closeOverlay}/>}
      {(overlay === 'signin' || overlay === 'participant') && <ParticipantPanel participant={participant} onSignIn={signIn} onSignOut={signOut} onClose={closeOverlay}/>}
      {overlay === 'submit' && <SubmitPanel participant={participant} onSubmitted={work => submitWork(participant, work)} onClose={closeOverlay} onNeedSignIn={() => setOverlay('signin')}/>}
      {changed && <div className="hs-refresh">Saved. Closing the studio restarts the visit to load the updated collection and winners. Your pilot and XP stay saved.</div>}
    </div>}
    {trailer && <TrailerPlayer src={`/app-assets/by-id/${appId}/${TRAILER_FILE}`} music={music}
      onClose={closeTrailer} onDuck={on => track.current?.duck(on)}/>}
    {notice && <div className="hs-notice" role="alert">{notice}<button onClick={() => setNotice('')}>DISMISS</button></div>}
  </>;
}
