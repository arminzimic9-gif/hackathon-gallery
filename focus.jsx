import React, { useEffect, useRef, useState } from 'react'
import { Brush, ChevronLeft, ChevronRight, Close, Expand, Heart, Search, User } from './icons.jsx'
import { POSTER_STYLES } from './art.js'

const EMOJI = ['🔥', '👏', '😂', '💚']
const initials = (name) => String(name || '?').split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('') || '?'
const addedYear = (item) => item.created_at ? new Date(item.created_at * 1000).getFullYear() : null

// The central artwork is the card; neighbours form a curved, secondary row.
// Keeping the artwork in the card (rather than only behind it) makes focus mode
// legible on a phone and true to the exhibition reference.
export default function FocusView({ items, index, onIndex, onClose, onReact, thumbFor, liked, onLike, version }) {
  const [tray, setTray] = useState(false), [authorOpen, setAuthorOpen] = useState(false)
  const [expanded, setExpanded] = useState(false), [searchOpen, setSearchOpen] = useState(false), [query, setQuery] = useState('')
  const swipe = useRef(null), wheel = useRef({ acc: 0, at: 0 })
  const item = items[index], count = items.length
  const go = (step) => { if (count > 1) onIndex((index + step + count) % count) }
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') { if (searchOpen) setSearchOpen(false); else if (expanded) setExpanded(false); else onClose(); return }
      if (e.target.closest?.('input')) return
      if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1) }
      else if (e.key === 'ArrowRight') { e.preventDefault(); go(1) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })
  useEffect(() => { setTray(false); setAuthorOpen(false); setExpanded(false) }, [index])
  if (!item) return null
  const palette = POSTER_STYLES[(item.palette || 0) % POSTER_STYLES.length]
  const src = thumbFor(item.id)
  const byAuthor = items.filter((a) => a.author === item.author).length
  const date = item.art_date || (addedYear(item) ? 'ADDED ' + addedYear(item) : 'DATE NOT SUPPLIED')
  const matches = query.trim() ? items.map((a, i) => ({ a, i })).filter(({ a }) => (a.title + ' ' + a.author).toLowerCase().includes(query.toLowerCase())).slice(0, 6) : []
  const onWheel = (e) => {
    const w = wheel.current, now = performance.now()
    w.acc += Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY
    if (Math.abs(w.acc) > 70 && now - w.at > 380) { go(w.acc > 0 ? 1 : -1); w.acc = 0; w.at = now }
  }
  const onDown = (e) => { swipe.current = { x: e.clientX, id: e.pointerId, moved: false } }
  const onMove = (e) => {
    const s = swipe.current; if (!s || s.id !== e.pointerId) return
    if (Math.abs(e.clientX - s.x) > 46) { go(e.clientX < s.x ? 1 : -1); s.x = e.clientX; s.moved = true }
  }
  const onUp = () => { setTimeout(() => { swipe.current = null }, 0) }
  const offsets = [-3, -2, -1, 1, 2, 3].filter((o) => Math.abs(o) <= Math.floor(count / 2))
  return <div className={'hg-focus' + (expanded ? ' is-expanded' : '')} role="dialog" aria-modal="false" aria-label={'Artwork: ' + item.title}>
    <div className="hg-fx-tools hg-glass" role="toolbar" aria-label="Artwork actions" aria-orientation="vertical">
      <button className={tray ? 'is-on' : ''} onClick={() => { setTray((v) => !v); setAuthorOpen(false) }} aria-label="React to artwork" aria-expanded={tray}><Brush/></button>
      <button className={liked?.has(item.id) ? 'is-on' : ''} onClick={() => onLike(item)} aria-label={liked?.has(item.id) ? 'Unlike' : 'Like'} aria-pressed={liked?.has(item.id)}><Heart filled={liked?.has(item.id)}/></button>
      <button className={authorOpen ? 'is-on' : ''} onClick={() => { setAuthorOpen((v) => !v); setTray(false) }} aria-label="About the artist" aria-expanded={authorOpen}><User/></button>
      {tray && <div className="hg-fx-pop hg-glass hg-fx-tray">{EMOJI.map((e) => <button key={e} onClick={() => onReact(item, e)} aria-label={'React ' + e}><span>{e}</span>{item.reactions?.[e] ? <small>{item.reactions[e]}</small> : null}</button>)}</div>}
      {authorOpen && <div className="hg-fx-pop hg-glass hg-fx-author"><span className="hg-t-label">ARTIST</span><b>{item.author}</b><small>{byAuthor} {byAuthor === 1 ? 'piece' : 'pieces'} in the collection</small><small>{[item.artist_years, item.artist_place].filter(Boolean).join(' · ') || 'No biography supplied'}</small></div>}
    </div>

    <div className="hg-cover" onWheel={onWheel} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} aria-label="Neighbouring pieces">
      {offsets.map((o) => {
        const i = (index + o + count * 4) % count, a = items[i], neighbour = thumbFor(a.id)
        return <button key={a.id + ':' + o} className="hg-cover-card" style={{ '--o': o, '--abs': Math.abs(o) }} onClick={() => { if (!swipe.current?.moved) onIndex(i) }} aria-label={'Show ' + a.title} data-v={version}>
          {neighbour ? <img src={neighbour} alt="" draggable="false"/> : <i/>}<span>{a.title}</span>
        </button>
      })}
    </div>

    <article className="hg-fx-card hg-glass" key={item.id}>
      <div className="hg-fx-art" style={{ background: `linear-gradient(135deg,${palette[0]},${palette[1]})` }}>
        {src ? <img src={src} alt={item.title} draggable="false"/> : <div className="hg-fx-art-empty">ARTWORK LOADING</div>}
        <button className="hg-fx-expand hg-glass" onClick={() => setExpanded((v) => !v)} aria-label={expanded ? 'Collapse artwork' : 'Expand artwork'} aria-pressed={expanded}><Expand/><span>{expanded ? 'COLLAPSE' : 'EXPAND'}</span></button>
      </div>
      <div className="hg-fx-info">
        <div className="hg-fx-title-row"><h2>{item.title}</h2><time>{date}</time></div>
        <p className="hg-fx-quote">{item.caption || 'No caption supplied.'}</p>
        <div className="hg-fx-details"><span><small>MEDIUM</small><b>{item.medium || (item.placeholder ? 'Procedural gallery sample' : 'Digital image')}</b></span><span><small>DIMENSIONS</small><b>{item.dimensions || 'Not supplied'}</b></span></div>
      </div>
      <button className="hg-fx-close" onClick={onClose} aria-label="Close artwork"><Close/></button>
    </article>

    <div className="hg-pill hg-glass">
      <button onClick={() => go(-1)} aria-label="Previous piece" disabled={count < 2}><ChevronLeft/></button>
      <span className="hg-pill-avatar" style={{ background: `linear-gradient(135deg, ${palette[0]}, ${palette[1]})` }} aria-hidden="true">{initials(item.author)}</span>
      <span className="hg-pill-text"><b>{item.author}</b><small>{[item.artist_years, item.artist_place].filter(Boolean).join(' · ') || `${String(index + 1).padStart(2, '0')} / ${String(count).padStart(2, '0')} IN COLLECTION`}</small></span>
      <button onClick={() => setSearchOpen((v) => !v)} aria-label="Search artworks" aria-expanded={searchOpen}><Search/></button>
      <button onClick={() => go(1)} aria-label="Next piece" disabled={count < 2}><ChevronRight/></button>
    </div>
    {searchOpen && <div className="hg-fx-search hg-glass" role="search"><label htmlFor="hg-art-search">SEARCH THE COLLECTION</label><input id="hg-art-search" autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Title or artist" maxLength={100}/><div>{matches.length ? matches.map(({ a, i }) => <button key={a.id} onClick={() => { onIndex(i); setSearchOpen(false); setQuery('') }}>{a.title}<small>{a.author}</small></button>) : <small>{query ? 'No matching works' : 'Type to find a work'}</small>}</div></div>}
  </div>
}
