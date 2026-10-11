import React, { useState } from 'react'
import { ADMIN_CSS } from './admin-style.js'
import { prepareImage, requestGallery } from './station-service.js'

const ENDPOINT = '/api/app-services/hackathon-gallery/submit'

function ArtRow({ item, index, total, onMove, onUpdate, onRemove, busy }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState({ title: item.title, author: item.author, caption: item.caption })
  const [confirm, setConfirm] = useState(false)
  return <div className="hg-admin-row">
    <div className={'hg-admin-thumb hg-admin-thumb-' + ((item.palette || 0) % 9)}>{item.placeholder ? <span>SAMPLE</span> : <span>ART</span>}</div>
    <div className="hg-admin-row-main">
      <div className="hg-admin-row-top"><b>{item.title}</b><small>{item.placeholder ? 'SAMPLE' : 'LIVE'}</small></div>
      <p>{item.author}</p>
      <div className="hg-admin-row-actions">
        <button onClick={() => onMove(index, -1)} disabled={busy || index === 0} aria-label={'Move ' + item.title + ' up'}>↑</button>
        <button onClick={() => onMove(index, 1)} disabled={busy || index === total - 1} aria-label={'Move ' + item.title + ' down'}>↓</button>
        <button onClick={() => { setEditing(!editing); setConfirm(false) }}>{editing ? 'CANCEL' : 'EDIT'}</button>
        <button className="hg-admin-danger" onClick={() => setConfirm(!confirm)}>{confirm ? 'CANCEL' : 'REMOVE'}</button>
        <select className="hg-admin-room" aria-label={'Category for ' + item.title} value={item.room || ''} disabled={busy} onChange={(e) => onUpdate(item.id, { room: e.target.value }).catch(() => {})}>
          {[['', 'AUTO CATEGORY'], ['memes', 'MEMES'], ['art', 'ART'], ['apps', 'APPS & GAMES'], ['agents', 'AGENTS']].map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </div>
      {confirm && <div className="hg-admin-confirm"><span>Remove this piece from the station collection?</span><button onClick={() => onRemove(item.id)} disabled={busy}>YES, REMOVE</button></div>}
      {editing && <div className="hg-admin-edit">
        <label>TITLE<input value={draft.title} maxLength={100} onChange={(e) => setDraft({ ...draft, title: e.target.value })}/></label>
        <label>AUTHOR<input value={draft.author} maxLength={80} onChange={(e) => setDraft({ ...draft, author: e.target.value })}/></label>
        <label>CAPTION<textarea value={draft.caption} maxLength={500} onChange={(e) => setDraft({ ...draft, caption: e.target.value })}/></label>
        <button onClick={() => { onUpdate(item.id, draft).then(() => setEditing(false)).catch(() => {}) }} disabled={busy}>SAVE CHANGES</button>
      </div>}
    </div>
  </div>
}

export default function Admin({ appId, token, state, onState, onClose }) {
  const [tab, setTab] = useState('collection'), [title, setTitle] = useState(''), [author, setAuthor] = useState('')
  const [caption, setCaption] = useState(''), [url, setUrl] = useState(''), [file, setFile] = useState(null)
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [success, setSuccess] = useState('')
  const [decision, setDecision] = useState(null)
  const [codes, setCodes] = useState([]), [codeCount, setCodeCount] = useState(5), [codeLabel, setCodeLabel] = useState('')
  const art = state.art || [], queue = state.queue || []
  const liveCodes = codes.filter((code) => !code.revoked)

  async function run(work, message = '') {
    setBusy(true); setError(''); setSuccess('')
    try { const result = await work(); if (result?.art) onState(result); if (message) setSuccess(message); return result }
    catch (e) { setError(e.message); throw e }
    finally { setBusy(false) }
  }
  async function add(e) {
    e.preventDefault()
    if (!file && !url.trim()) { setError('Choose a file or enter an image URL.'); return }
    try {
      await run(async () => {
        let source = file
        if (!source) {
          const parsed = new URL(url)
          if (parsed.protocol !== 'https:') throw new Error('Image URLs must use HTTPS.')
          const response = await fetch('/api/proxy?url=' + encodeURIComponent(parsed.href), {
            headers: { Authorization: 'Bearer ' + token },
          })
          if (!response.ok) throw new Error('Could not fetch that image. Try uploading the file instead.')
          source = await response.blob()
        }
        const image_data_url = await prepareImage(source)
        await requestGallery(appId, token, 'admin/add', { title, author, caption, image_data_url })
        const next = await requestGallery(appId, token, 'state')
        setFile(null); setUrl(''); setTitle(''); setAuthor(''); setCaption('')
        return next
      }, 'Artwork added to the station collection.')
    } catch {}
  }
  async function reorder(index, delta) {
    const ids = art.map((item) => item.id), next = index + delta
    ;[ids[index], ids[next]] = [ids[next], ids[index]]
    try { await run(() => requestGallery(appId, token, 'admin/reorder', { ids })) } catch {}
  }
  async function update(id, changes) { return run(() => requestGallery(appId, token, 'admin/update', { id, ...changes })) }
  async function remove(id) { try { await run(() => requestGallery(appId, token, 'admin/remove', { id }), 'Artwork removed.') } catch {} }
  async function review(id, action) {
    try { await run(() => requestGallery(appId, token, 'admin/' + action, { id }), action === 'approve' ? 'Submission is now in the station collection.' : 'Submission rejected.'); setDecision(null) } catch {}
  }
  async function refresh() { try { await run(() => requestGallery(appId, token, 'state')) } catch {} }
  async function loadCodes() {
    try { setCodes((await run(() => requestGallery(appId, token, 'codes'))).codes) } catch {}
  }
  async function createCodes(e) {
    e.preventDefault()
    try {
      const result = await run(() => requestGallery(appId, token, 'codes/create', { count: codeCount, label: codeLabel }),
        codeCount + ' participant code' + (codeCount === 1 ? '' : 's') + ' ready to share.')
      setCodes(result.codes)
    } catch {}
  }
  async function setRevoked(code, revoked) {
    try { setCodes((await run(() => requestGallery(appId, token, 'codes/revoke', { code, revoked }))).codes) } catch {}
  }
  async function copyText(value, message) {
    const ok = await window.mobius.clipboard.writeText(value)
    if (ok) setSuccess(message)
    else setError('Copy unavailable. Select the text below to copy it.')
  }
  async function copyEndpoint() {
    const value = state.submission_url || ENDPOINT
    const ok = await window.mobius.clipboard.writeText(value)
    if (ok) setSuccess('Submission endpoint copied.')
    else setError('Copy unavailable. Select the endpoint below to copy it.')
  }
  return <div className="hg-admin-scrim" role="dialog" aria-modal="true" aria-label="Curator studio" onClick={onClose}>
    <style>{ADMIN_CSS}</style>
    <div className="hg-admin" onClick={(e) => e.stopPropagation()}>
      <header className="hg-admin-head"><div><span>OWNER STUDIO / 2026</span><h2>CURATE THE<br/>STATION<span>.</span></h2></div><button onClick={onClose} aria-label="Close curator studio">×</button></header>
      <div className="hg-admin-tabs" role="tablist" aria-label="Curator views">
        {[['collection','COLLECTION'],['submissions','SUBMISSIONS'],['participants','PARTICIPANTS'],['ceremony','CEREMONY']].map(([key,label]) => <button role="tab" aria-selected={tab === key} className={tab === key ? 'active' : ''} key={key} onClick={() => { setTab(key); if (key === 'participants' && !codes.length) loadCodes() }}>{label}{key === 'submissions' && queue.length ? <em>{queue.length}</em> : null}{key === 'participants' && liveCodes.length ? <em>{liveCodes.length}</em> : null}</button>)}
      </div>
      <div className="hg-admin-body">
        {error && <div className="hg-admin-error" role="alert">{error}</div>}
        {success && <div className="hg-admin-success" role="status">{success}</div>}
        {tab === 'collection' && <>
          <div className="hg-admin-section-title"><div><span>01 / COLLECTION</span><h3>Station collection <small>{art.length}/{state.capacity || 56}</small></h3></div></div>
          <form className="hg-admin-form" onSubmit={add}>
            <div className="hg-admin-form-head">ADD A PIECE <span>PNG / JPEG / WEBP / GIF · UP TO 3 MB</span></div>
            <div className="hg-admin-form-grid"><label>TITLE<input required value={title} maxLength={100} onChange={(e) => setTitle(e.target.value)} placeholder="Name this piece"/></label><label>ARTIST / AUTHOR<input required value={author} maxLength={80} onChange={(e) => setAuthor(e.target.value)} placeholder="Who made it?"/></label></div>
            <label>CAPTION<textarea value={caption} maxLength={500} onChange={(e) => setCaption(e.target.value)} placeholder="The story behind it…"/></label>
            <div className="hg-admin-sources"><label className="hg-admin-file">{file ? file.name : 'CHOOSE IMAGE OR GIF'}<input type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={(e) => setFile(e.target.files?.[0] || null)}/></label><span>OR</span><input aria-label="Image URL" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="Paste an HTTPS image link"/></div>
            <button className="hg-admin-submit" disabled={busy || art.length >= (state.capacity || 56)}>{busy ? 'WORKING…' : 'ADD TO STATION  →'}</button>
          </form>
          <p className="hg-admin-note">New pieces are resized for the station (HTTPS links should be under 2 MB). Twelve hologram frames rotate through the full collection. Reorder with the arrows; sample pieces are labelled and can be removed.</p>
          <div className="hg-admin-list">{art.map((item, index) => <ArtRow key={item.id} item={item} index={index} total={art.length} busy={busy} onMove={reorder} onUpdate={update} onRemove={remove}/>)}</div>
        </>}
        {tab === 'submissions' && <>
          <div className="hg-admin-section-title"><div><span>02 / MODERATION</span><h3>Incoming work <small>{queue.length} awaiting review</small></h3></div><button onClick={refresh} disabled={busy}>REFRESH</button></div>
          <div className="hg-admin-endpoint"><span>PUBLIC SUBMISSION ENDPOINT</span><div><code>{state.submission_url || ENDPOINT}</code><button onClick={copyEndpoint}>COPY</button></div><p>Participants sign in with a code from the PARTICIPANTS tab and submit through the station itself; this endpoint stays available for another Möbius instance. Nothing appears in the station until you approve it, and every submission records the verified code behind it.</p></div>
          {queue.length ? queue.map((item) => <div className="hg-admin-submission" key={item.id}><div><span>UNREVIEWED · {new Date(item.created_at * 1000).toLocaleDateString()}</span><h4>{item.title}</h4><b>BY {item.author}</b><p>{item.caption || 'No caption supplied.'}</p><small>Submitted as: {item.sender} · {item.mime}</small></div><div className="hg-admin-review"><button onClick={() => review(item.id, 'approve')} disabled={busy || art.length >= (state.capacity || 56)}>APPROVE →</button><button onClick={() => setDecision(item.id)} disabled={busy}>REJECT</button></div>{decision === item.id && <div className="hg-admin-confirm"><span>Reject and remove the attached image?</span><button onClick={() => review(item.id, 'reject')} disabled={busy}>YES, REJECT</button><button onClick={() => setDecision(null)}>CANCEL</button></div>}</div>) : <div className="hg-admin-empty"><b>No submissions yet.</b><p>Share the endpoint to invite art and memes. New work waits here for your approval.</p></div>}
        </>}
        {tab === 'participants' && <>
          <div className="hg-admin-section-title"><div><span>03 / ACCESS</span><h3>Participant codes <small>{liveCodes.length} active</small></h3></div><button onClick={loadCodes} disabled={busy}>REFRESH</button></div>
          <p className="hg-admin-note">Guests explore, fly and play without signing in. A code is what lets a participant submit work and appear on the official Top Pilots board, so issue one per person or team and withdraw it if it leaks.</p>
          <form className="hg-admin-form" onSubmit={createCodes}>
            <div className="hg-admin-form-head">ISSUE CODES <span>UP TO 50 AT A TIME</span></div>
            <div className="hg-admin-form-grid">
              <label>HOW MANY<select value={codeCount} onChange={(e) => setCodeCount(Number(e.target.value))} aria-label="How many codes">
                {[1, 5, 10, 25, 50].map((n) => <option key={n} value={n}>{n}</option>)}
              </select></label>
              <label>LABEL (OPTIONAL)<input value={codeLabel} maxLength={60} onChange={(e) => setCodeLabel(e.target.value)} placeholder="e.g. Finalists, Team Nova"/></label>
            </div>
            <button className="hg-admin-submit" disabled={busy}>{busy ? 'WORKING…' : 'CREATE CODES  →'}</button>
          </form>
          {liveCodes.length ? <div className="hg-admin-endpoint"><span>SHARE THESE</span><div><code>{liveCodes.map((c) => c.code).join('  ·  ')}</code><button onClick={() => copyText(liveCodes.map((c) => c.code).join('\n'), 'Active codes copied.')}>COPY ALL</button></div><p>Each code works on any device and stays valid for 30 days after the participant signs in with it.</p></div> : <div className="hg-admin-empty"><b>No active codes yet.</b><p>Create codes above, then share them with participants. Until then nobody can submit work or enter the official board.</p></div>}
          {codes.length ? <div className="hg-admin-list">{codes.map((item) => <div className="hg-admin-code-row" key={item.code}>
            <div><b>{item.code}</b><small>{item.label ? item.label + ' · ' : ''}{item.revoked ? 'WITHDRAWN' : item.used_at ? 'SIGNED IN ' + new Date(item.used_at * 1000).toLocaleDateString() : 'NOT USED YET'}</small></div>
            <button onClick={() => copyText(item.code, 'Code copied.')} disabled={busy}>COPY</button>
            <button className={item.revoked ? '' : 'selected'} onClick={() => setRevoked(item.code, !item.revoked)} disabled={busy}>{item.revoked ? 'RESTORE' : 'WITHDRAW'}</button>
          </div>)}</div> : null}
        </>}
        {tab === 'ceremony' && <>
          <div className="hg-admin-section-title"><div><span>04 / CLOSING NIGHT</span><h3>Set the stage <small>11 OCT 2026</small></h3></div></div>
          <p className="hg-admin-note">Choose works for the big-screen slideshow and assign up to three winner places. Start Ceremony in the hall to dim the lights and reveal them.</p>
          {art.map((item) => <div className="hg-admin-ceremony-row" key={item.id}><div><b>{item.title}</b><small>{item.author}</small></div><button className={item.ceremony ? 'selected' : ''} onClick={() => update(item.id, { ceremony: !item.ceremony }).catch(() => {})} disabled={busy}>{item.ceremony ? 'ON SCREEN ✓' : 'ADD TO SCREEN'}</button><select aria-label={'Winner place for ' + item.title} value={item.winner_rank || 0} onChange={(e) => update(item.id, { winner_rank: Number(e.target.value) }).catch(() => {})} disabled={busy}><option value={0}>NO PLACE</option><option value={1}>1ST PLACE</option><option value={2}>2ND PLACE</option><option value={3}>3RD PLACE</option></select></div>)}
        </>}
      </div>
    </div>
  </div>
}
