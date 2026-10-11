import React, { useEffect, useState } from 'react';
import { prepareImage } from './station-service.js';

export const PARTICIPANT_CSS = `
.hs-part-kicker { display:block; color:var(--ink-2); font:600 10px/1 var(--font); letter-spacing:.22em; text-transform:uppercase; }
.hs-part-lede { margin:-12px 0 20px; color:var(--ink-2); font:400 13px/1.55 var(--font); }
.hs-part-form { display:grid; gap:12px; }
.hs-part-form label { display:grid; gap:6px; color:var(--ink-2); font:600 10px/1 var(--font); letter-spacing:.16em; text-transform:uppercase; }
.hs-part-form input[type=text], .hs-part-form textarea {
  width:100%; padding:12px 13px; color:var(--ink); background:#fff;
  border:1px solid var(--line); border-radius:0; font:500 14px/1.3 var(--font); letter-spacing:.02em;
}
.hs-part-form input:focus-visible, .hs-part-form textarea:focus-visible, .hs-part-cta:focus-visible { outline:2px solid var(--orange); outline-offset:2px; }
.hs-part-form textarea { min-height:76px; resize:vertical; }
.hs-part-code { text-transform:uppercase; letter-spacing:.14em !important; }
.hs-part-cta { min-height:46px; padding:13px 18px; border:0; border-left:3px solid var(--orange); background:var(--tag); color:#fff; cursor:pointer; font:700 11px/1 var(--font); letter-spacing:.16em; text-transform:uppercase; }
.hs-part-cta:disabled { opacity:.5; cursor:progress; }
.hs-part-cta.ghost { color:var(--ink); background:var(--paper); box-shadow:inset 0 0 0 1px var(--line); }
.hs-part-error { margin:0; padding:11px 13px; color:#5c1d0c; background:#ffe9dd; border-left:3px solid var(--orange); font:600 12px/1.4 var(--font); }
.hs-part-ok { margin:0; padding:11px 13px; color:#123c22; background:#e2f6e6; border-left:3px solid #2f9e57; font:600 12px/1.4 var(--font); }
.hs-part-note { margin:14px 0 0; color:var(--ink-2); font:400 12px/1.5 var(--font); }
.hs-part-card { display:grid; gap:4px; margin:0 0 18px; padding:14px 15px; background:#fff; box-shadow:inset 0 0 0 1px var(--line); }
.hs-part-card b { font:600 17px/1.2 var(--font); }
.hs-part-card span { color:var(--ink-2); font:500 11px/1.5 var(--font); letter-spacing:.08em; }
.hs-part-row { display:flex; flex-wrap:wrap; gap:10px; margin-top:6px; }
.hs-part-file { position:relative; display:flex; align-items:center; justify-content:center; min-height:46px; padding:12px 14px; color:var(--ink); background:#fff; box-shadow:inset 0 0 0 1px var(--line); cursor:pointer; font:600 11px/1.2 var(--font); letter-spacing:.12em; text-transform:uppercase; overflow:hidden; }
.hs-part-file input { position:absolute; inset:0; opacity:0; cursor:pointer; }
.hs-part-preview { display:flex; align-items:center; gap:12px; }
.hs-part-preview img { width:74px; height:74px; object-fit:cover; background:#eef2f4; box-shadow:inset 0 0 0 1px var(--line); }
.hs-part-preview small { color:var(--ink-2); font:400 11px/1.5 var(--font); }
@media (max-width:760px) { .hs-part-lede { font-size:12px; } .hs-part-form { gap:10px; } }
`;

function Shell({ title, kicker, onClose, children }) {
  return <div className="st-modal-back" role="dialog" aria-modal="true" aria-label={title}>
    <div className="st-modal">
      <button className="st-close" onClick={onClose} aria-label={'Close ' + title}>×</button>
      <span className="st-overline hs-part-kicker">{kicker}</span>
      <h2>{title}</h2>
      {children}
    </div>
  </div>;
}

export function ParticipantPanel({ participant, onSignIn, onSignOut, onClose }) {
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(event) {
    event.preventDefault();
    setBusy(true); setError('');
    try { await onSignIn(code.trim(), name.trim()); } catch (e) { setError(e.message); } finally { setBusy(false); }
  }

  if (participant) return <Shell title="PARTICIPANT" kicker="SIGNED IN ON THIS DEVICE" onClose={onClose}>
    <div className="hs-part-card"><b>{participant.name}</b>
      <span>CODE {participant.code}</span>
      <span>{participant.expires_at ? 'SIGNED IN UNTIL ' + new Date(participant.expires_at * 1000).toLocaleDateString() : ''}</span>
    </div>
    <p className="hs-part-note">You can submit work to the collection and your flight runs count on the official Top Pilots board. Guests can still explore and fly freely.</p>
    <div className="hs-part-row">
      <button className="hs-part-cta ghost" onClick={() => onSignOut()} disabled={busy}>SIGN OUT</button>
      <button className="hs-part-cta" onClick={onClose}>BACK TO THE STATION</button>
    </div>
  </Shell>;

  return <Shell title="PARTICIPANT SIGN-IN" kicker="HACKATHON STATION · 2026" onClose={onClose}>
    <p className="hs-part-lede">Guests explore the station, fly and play without an account. Sign in with the participant code from the organiser to submit artwork and to appear on the official Top Pilots board.</p>
    <form className="hs-part-form" onSubmit={submit}>
      <label>PARTICIPANT CODE
        <input className="hs-part-code" type="text" required autoComplete="off" spellCheck={false}
          value={code} maxLength={24} placeholder="HS-XXXX-XXXX"
          onChange={e => setCode(e.target.value.toUpperCase())}/>
      </label>
      <label>NAME ON YOUR WORK AND RESULTS
        <input type="text" required autoComplete="name" value={name} maxLength={24} placeholder="How should the station credit you?"
          onChange={e => setName(e.target.value)}/>
      </label>
      {error && <p className="hs-part-error" role="alert">{error}</p>}
      <button className="hs-part-cta" disabled={busy}>{busy ? 'CHECKING…' : 'SIGN IN'}</button>
    </form>
    <p className="hs-part-note">Codes are issued to hackathon participants by the organiser. This device remembers your sign-in; there is no password and nothing is shared with anyone else.</p>
  </Shell>;
}

export function SubmitPanel({ participant, onSubmitted, onClose, onNeedSignIn }) {
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState(participant?.name || '');
  const [caption, setCaption] = useState('');
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  // Preview URLs are local object URLs; release each one when it is replaced.
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  if (!participant) return <Shell title="SUBMIT WORK" kicker="PARTICIPANTS ONLY" onClose={onClose}>
    <p className="hs-part-lede">Artwork and memes for the station collection come from signed-in participants, and every piece is reviewed by the organiser before it appears.</p>
    <div className="hs-part-row">
      <button className="hs-part-cta" onClick={onNeedSignIn}>SIGN IN TO SUBMIT</button>
      <button className="hs-part-cta ghost" onClick={onClose}>KEEP EXPLORING</button>
    </div>
  </Shell>;

  async function submit(event) {
    event.preventDefault();
    if (!file) { setError('Choose the image you want to exhibit.'); return; }
    setBusy(true); setError('');
    try {
      const image_data_url = await prepareImage(file);
      await onSubmitted({ title: title.trim(), author: author.trim(), caption: caption.trim(), image_data_url });
      setSent(true);
      setTitle(''); setCaption(''); setFile(null); setPreview('');
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }

  if (sent) return <Shell title="SUBMITTED" kicker="AWAITING REVIEW" onClose={onClose}>
    <p className="hs-part-ok" role="status">Received. The organiser reviews every submission, so it appears in the station once it is approved.</p>
    <div className="hs-part-row">
      <button className="hs-part-cta ghost" onClick={() => setSent(false)}>SUBMIT ANOTHER</button>
      <button className="hs-part-cta" onClick={onClose}>BACK TO THE STATION</button>
    </div>
  </Shell>;

  return <Shell title="SUBMIT WORK" kicker={'SIGNED IN AS ' + participant.name.toUpperCase()} onClose={onClose}>
    <p className="hs-part-lede">One image per submission, under 3 MB. It is resized for the holo frames and waits in the organiser's review queue.</p>
    <form className="hs-part-form" onSubmit={submit}>
      <label>TITLE<input type="text" required value={title} maxLength={100} placeholder="Name this piece" onChange={e => setTitle(e.target.value)}/></label>
      <label>ARTIST / AUTHOR<input type="text" required value={author} maxLength={80} placeholder="Who made it?" onChange={e => setAuthor(e.target.value)}/></label>
      <label>CAPTION<textarea value={caption} maxLength={500} placeholder="The story behind it…" onChange={e => setCaption(e.target.value)}/></label>
      <div className="hs-part-preview">
        {preview ? <img src={preview} alt="Selected artwork preview"/> : null}
        <label className="hs-part-file">{file ? file.name : 'CHOOSE IMAGE OR GIF'}
          <input type="file" accept="image/png,image/jpeg,image/webp,image/gif"
            onChange={e => {
              const next = e.target.files?.[0] || null;
              setFile(next);
              setPreview(next ? URL.createObjectURL(next) : '');
            }}/>
        </label>
      </div>
      {error && <p className="hs-part-error" role="alert">{error}</p>}
      <button className="hs-part-cta" disabled={busy}>{busy ? 'SENDING…' : 'SEND FOR REVIEW'}</button>
    </form>
  </Shell>;
}
