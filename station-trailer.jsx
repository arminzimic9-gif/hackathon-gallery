import React, { useEffect, useRef, useState } from 'react';

export const TRAILER_FILE = 'trailer.mp4';
export const TRAILER_CREDIT = 'By Via Creativa Studio for Möbius · Music: Gregor Quendel, CC BY 4.0';

export const TRAILER_CSS = `
.hs-trailer{position:fixed;inset:0;z-index:60;display:grid;grid-template-rows:auto minmax(0,1fr) auto;background:#02040a;color:#f4f6f8;font-family:var(--font);outline:none}
.hs-trailer-bar{display:flex;align-items:center;gap:14px;padding:max(10px,var(--mobius-safe-top,0px)) 14px 10px 18px}
.hs-trailer-bar b{flex:1;font:700 11px/1.2 var(--font);letter-spacing:.24em;text-transform:uppercase}
.hs-trailer-bar button{min-width:44px;min-height:44px;border:0;background:var(--paper);color:var(--ink);font:700 11px/1 var(--font);letter-spacing:.16em;padding:0 16px;cursor:pointer}
.hs-trailer-bar button:focus-visible,.hs-trailer-watch:focus-visible{outline:2px solid var(--orange);outline-offset:2px}
.hs-trailer video{width:100%;height:100%;min-height:0;object-fit:contain;background:#000}
.hs-trailer-foot{padding:9px 18px max(10px,var(--mobius-safe-bottom,0px));font:500 10px/1.5 var(--font);letter-spacing:.12em;color:#9aa3ae}
.hs-trailer-foot em{font-style:normal;color:#ffb36b}
.hs-trailer-watch{display:inline-block;margin-top:14px;min-height:44px;border:1px solid #6fd3ff88;background:#02040a99;color:#e9faff;font:600 11px/1 var(--font);letter-spacing:.24em;text-transform:uppercase;padding:0 22px;cursor:pointer;opacity:0;transition:opacity 1s 2.8s;box-shadow:0 0 28px #61c9ff33}
.st-intro.show .hs-trailer-watch{opacity:1}
.hs-trailer-watch:hover{background:#0b2433;box-shadow:0 0 36px #61c9ff77}
.hs-tools nav .hs-trailer-tool{color:var(--ink)}
@media (pointer:coarse){.hs-esc{display:none}}
@media (max-width:760px){.hs-trailer-bar b{letter-spacing:.14em}.hs-trailer-foot{font-size:9px}}
`;

/**
 * Full-screen trailer. The <video> exists only while this component is
 * mounted, so the file is never fetched until the visitor asks for it and the
 * 3D scene is never delayed by it. The sound follows the Station Tools
 * setting: MUSIC OFF starts the trailer muted (the player's own controls can
 * still unmute) and the volume slider sets the starting volume.
 */
export function TrailerPlayer({ src, music, onClose, onDuck }) {
  const box = useRef(null), video = useRef(null);
  const [problem, setProblem] = useState('');
  useEffect(() => {
    const el = video.current;
    el.volume = Math.min(1, Math.max(0, music.volume));
    el.muted = !music.on;
    onDuck?.(true);
    const previous = document.activeElement;
    box.current.focus({ preventScroll: true });
    const key = (e) => {
      if (e.key !== 'Escape') return;
      e.preventDefault(); e.stopImmediatePropagation(); onClose();
    };
    window.addEventListener('keydown', key, true);
    el.play().catch(() => {}); // Controls stay visible if the browser wants a tap.
    return () => {
      window.removeEventListener('keydown', key, true);
      el.pause(); el.removeAttribute('src'); el.load(); // Drop the download as well.
      onDuck?.(false);
      if (previous?.isConnected) previous.focus?.({ preventScroll: true });
    };
  }, []);
  const stop = (e) => e.stopPropagation();
  return <div className="hs-trailer" ref={box} tabIndex={-1} role="dialog" aria-modal="true"
    aria-label="Hackathon Station trailer" onKeyDown={stop} onKeyUp={stop}>
    <div className="hs-trailer-bar">
      <b>HACKATHON STATION · OFFICIAL TRAILER</b>
      <button onClick={onClose} aria-label="Close trailer">CLOSE ×</button>
    </div>
    <video ref={video} src={src} controls playsInline preload="auto" controlsList="nodownload"
      onError={() => setProblem('The trailer could not be loaded. Check your connection and try again.')}/>
    <div className="hs-trailer-foot">
      {problem ? <em>{problem}</em> : <>
        {TRAILER_CREDIT}.{!music.on && <> <em>Sound is off in Station Tools; use the player's speaker button to turn it on.</em></>}
      </>} <span className="hs-esc">Esc closes.</span>
    </div>
  </div>;
}

/**
 * The supplied intro is rebuilt by the engine, so the button is attached by
 * watching for it rather than by editing the supplied UI module.
 */
export function installTrailerButton(root, onOpen) {
  const add = () => {
    const holder = root.querySelector('.st-intro > div');
    if (!holder || holder.querySelector('.hs-trailer-watch')) return;
    const button = document.createElement('button');
    button.className = 'hs-trailer-watch';
    button.type = 'button';
    button.textContent = '► Watch trailer';
    button.onclick = (e) => { e.stopPropagation(); onOpen(); };
    button.onkeydown = (e) => e.stopPropagation(); // Enter/Space must not start the game.
    holder.appendChild(button);
  };
  const watcher = new MutationObserver(add);
  watcher.observe(root, { childList: true, subtree: true });
  add();
  return { dispose() { watcher.disconnect(); } };
}
