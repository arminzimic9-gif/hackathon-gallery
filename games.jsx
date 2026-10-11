import React, { useEffect, useMemo, useRef, useState } from 'react'
import { GAMES } from './station-world.js'
import { Arrow, Close, Replay } from './icons.jsx'

const fmt = (s) => { const m = Math.floor(s / 60), r = s - m * 60; return m + ':' + r.toFixed(1).padStart(4, '0') }
function Leaderboard({ list, highlight }) {
  if (!list?.length) return <p className="hg-g-empty hg-t-small">No scores yet. Be the first on the board.</p>
  return <ol className="hg-g-board">{list.slice(0, 8).map((s, i) => <li key={i} className={highlight && s.created_at === highlight ? 'is-you' : ''}><span>{String(i + 1).padStart(2, '0')}</span><b>{s.name}</b><em>{s.display}</em></li>)}</ol>
}

// The cabinet screen: title, blurb, play, and this game's leaderboard.
export function CabinetScreen({ id, scores, onPlay, onClose }) {
  const g = GAMES.find((x) => x.id === id)
  useEffect(() => { const k = (e) => { if (e.key === 'Escape') onClose(); if (e.key === 'Enter') onPlay() }; window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k) })
  return <div className="hg-g-scrim" role="dialog" aria-modal="true" aria-label={g.name} style={{ '--g': g.hue }}>
    <div className="hg-g-panel hg-glass">
      <button className="hg-g-x" onClick={onClose} aria-label="Leave cabinet"><Close/></button>
      <span className="hg-t-label hg-g-kicker">HOLO TERMINAL · HANGAR</span>
      <h2 className="hg-g-title">{g.name}</h2>
      <p className="hg-t-body">{g.blurb}.</p>
      <button className="hg-g-play" onClick={onPlay} autoFocus><span>PLAY</span><Arrow/></button>
      <span className="hg-t-label hg-g-kicker">HIGH SCORES</span>
      <Leaderboard list={scores?.[id]}/>
    </div>
  </div>
}

// Memory Match with the gallery's real artworks: 6 pairs, timer starts on the first flip.
export function MemoryMatch({ art, thumbFor, onDone, onClose, audio }) {
  const deck = useMemo(() => {
    const pool = art.length ? art : []
    const picks = []; for (let i = 0; picks.length < 6 && pool.length; i++) picks.push(pool[i % pool.length])
    const cards = picks.flatMap((a, i) => [{ key: i + 'a', pair: i, art: a }, { key: i + 'b', pair: i, art: a }])
    for (let i = cards.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [cards[i], cards[j]] = [cards[j], cards[i]] }
    return cards
  }, [art])
  const [open, setOpen] = useState([]), [done, setDone] = useState(() => new Set()), [moves, setMoves] = useState(0)
  const [start, setStart] = useState(null), [now, setNow] = useState(0), [cursor, setCursor] = useState(0)
  const lock = useRef(false), cols = typeof window !== 'undefined' && window.innerWidth < 640 ? 3 : 4
  useEffect(() => { if (!start || done.size === deck.length) return; const t = setInterval(() => setNow(performance.now()), 100); return () => clearInterval(t) }, [start, done.size, deck.length])
  function flip(i) {
    if (lock.current || open.includes(i) || done.has(deck[i].pair)) return
    if (!start) setStart(performance.now())
    audio?.cue('flip')
    const next = [...open, i]; setOpen(next)
    if (next.length === 2) {
      setMoves((m) => m + 1); lock.current = true
      const [a, b] = next
      if (deck[a].pair === deck[b].pair) {
        setTimeout(() => {
          const d = new Set(done); d.add(deck[a].pair); setDone(d); setOpen([]); lock.current = false; audio?.cue('pop')
          if (d.size === deck.length / 2) { const secs = (performance.now() - (start || performance.now())) / 1000; audio?.cue('winner'); setTimeout(() => onDone(Math.max(1, Math.round(secs * 10) / 10), moves + 1), 700) }
        }, 420)
      } else setTimeout(() => { setOpen([]); lock.current = false }, 820)
    }
  }
  useEffect(() => {
    const k = (e) => {
      if (e.key === 'Escape') return onClose()
      const n = deck.length
      if (e.key === 'ArrowRight') setCursor((c) => (c + 1) % n)
      else if (e.key === 'ArrowLeft') setCursor((c) => (c - 1 + n) % n)
      else if (e.key === 'ArrowDown') setCursor((c) => (c + cols) % n)
      else if (e.key === 'ArrowUp') setCursor((c) => (c - cols + n) % n)
      else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); flip(cursor) }
      else return
      e.preventDefault()
    }
    window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k)
  })
  const elapsed = start ? ((done.size === deck.length / 2 ? now : now || performance.now()) - start) / 1000 : 0
  return <div className="hg-g-scrim hg-g-game" role="dialog" aria-modal="true" aria-label="Memory Match" style={{ '--g': GAMES[0].hue }}>
    <div className="hg-g-hud hg-glass"><span className="hg-t-label">MEMORY MATCH</span><b>{fmt(Math.max(0, elapsed))}</b><span className="hg-t-label hg-g-sub">{moves} {moves === 1 ? 'MOVE' : 'MOVES'} · {done.size}/{deck.length / 2}</span><button onClick={onClose} aria-label="Quit game"><Close/></button></div>
    <div className="hg-mm-grid" style={{ '--cols': cols }}>
      {deck.map((c, i) => { const shown = open.includes(i) || done.has(c.pair), src = thumbFor(c.art.id)
        return <button key={c.key} className={'hg-mm-card' + (shown ? ' is-up' : '') + (done.has(c.pair) ? ' is-done' : '') + (cursor === i ? ' is-cursor' : '')} onClick={() => { setCursor(i); flip(i) }} aria-label={shown ? c.art.title : 'Hidden card ' + (i + 1)}>
          <span className="hg-mm-back"><i/></span>
          <span className="hg-mm-face">{src ? <img src={src} alt="" draggable="false"/> : null}<small>{c.art.title}</small></span>
        </button> })}
    </div>
  </div>
}

// Live HUD for the in-world games.
export function GameHud({ state, onQuit }) {
  if (!state) return null
  const g = GAMES.find((x) => x.id === state.kind)
  return <div className="hg-g-live hg-glass" style={{ '--g': g.hue }} role="status">
    <span className="hg-t-label">{g.name}</span>
    {state.kind === 'coins' ? <><b>{Math.ceil(state.left)}s</b><span className="hg-g-meter"><i style={{ width: (state.collected / state.total * 100) + '%' }}/></span><span className="hg-t-label">{state.collected}/{state.total} COINS</span></>
      : <><b>{fmt(state.elapsed)}</b><span className="hg-g-dots">{[0, 1, 2, 3, 4].map((k) => <i key={k} className={k < state.found ? 'is-on' : ''}/>)}</span><span className="hg-t-label">MEMES HIDE IN THE HANGAR</span></>}
    <button onClick={onQuit} aria-label="Quit game"><Close/></button>
  </div>
}

// Result: enter a name once (remembered on this device), submit, see your rank.
export function GameResult({ result, scores, defaultName, onSubmit, onAgain, onClose }) {
  const g = GAMES.find((x) => x.id === result.game)
  const [name, setName] = useState(defaultName || ''), [saved, setSaved] = useState(null), [busy, setBusy] = useState(false), [error, setError] = useState('')
  const value = result.game === 'coins' ? result.score + ' coins' : fmt(result.score)
  const scoreless = result.game === 'coins' ? result.score <= 0 : result.found !== undefined && result.found < 5
  async function submit(e) {
    e.preventDefault(); if (!name.trim()) return
    setBusy(true); setError('')
    try { setSaved(await onSubmit(name.trim())) } catch (err) { setError(err.message) } finally { setBusy(false) }
  }
  return <div className="hg-g-scrim" role="dialog" aria-modal="true" aria-label={g.name + ' result'} style={{ '--g': g.hue }}>
    <div className="hg-g-panel hg-glass">
      <button className="hg-g-x" onClick={onClose} aria-label="Close result"><Close/></button>
      <span className="hg-t-label hg-g-kicker">{g.name} · {scoreless ? 'TIME' : 'GAME OVER'}</span>
      <h2 className="hg-g-title hg-g-score">{value}</h2>
      {saved ? <p className="hg-t-body">You placed <b>#{saved.rank}</b> on the board.</p>
        : scoreless ? <p className="hg-t-body">{result.game === 'coins' ? 'No coins this run.' : 'The clock ran out before all five memes.'} Have another go.</p>
        : <form className="hg-g-name" onSubmit={submit}><label className="hg-t-label" htmlFor="hg-player">YOUR NAME</label><div><input id="hg-player" value={name} maxLength={12} onChange={(e) => setName(e.target.value)} placeholder="Initials or name" autoFocus/><button disabled={busy || !name.trim()}>{busy ? 'SAVING…' : 'SAVE SCORE'}</button></div>{error && <small role="alert">{error}</small>}</form>}
      <span className="hg-t-label hg-g-kicker">HIGH SCORES</span>
      <Leaderboard list={saved?.scores?.[result.game] || scores?.[result.game]}/>
      <button className="hg-g-play" onClick={onAgain}><Replay/><span>PLAY AGAIN</span></button>
    </div>
  </div>
}
