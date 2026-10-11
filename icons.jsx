import React from 'react'

// Every glyph-like mark in the UI is an inline SVG so it renders identically on
// every device (no font fallback boxes, no emoji-presentation arrows).
const base = { width: '1em', height: '1em', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true, focusable: 'false' }

export const Spark = (p) => <svg {...base} {...p}><path d="M12 2.5v19M2.5 12h19M5.3 5.3l13.4 13.4M18.7 5.3 5.3 18.7"/></svg>
export const Arrow = (p) => <svg {...base} {...p}><path d="M5 12h14M13 6l6 6-6 6"/></svg>
export const ArrowUpRight = (p) => <svg {...base} {...p}><path d="M7 17 17 7M8 7h9v9"/></svg>
export const ChevronLeft = (p) => <svg {...base} {...p}><path d="m15 5-7 7 7 7"/></svg>
export const ChevronRight = (p) => <svg {...base} {...p}><path d="m9 5 7 7-7 7"/></svg>
export const Close = (p) => <svg {...base} {...p}><path d="M6 6l12 12M18 6 6 18"/></svg>
export const Heart = ({ filled, ...p }) => <svg {...base} {...p}><path fill={filled ? 'currentColor' : 'none'} d="M12 20s-7.5-4.6-9.2-9.3C1.6 7.2 3.9 4 7.3 4c2 0 3.5 1.1 4.7 2.7C13.2 5.1 14.7 4 16.7 4c3.4 0 5.7 3.2 4.5 6.7C19.5 15.4 12 20 12 20Z"/></svg>
export const Smile = (p) => <svg {...base} {...p}><circle cx="12" cy="12" r="9"/><path d="M8.5 14.5c1.9 2 5.1 2 7 0M9 9.5h.01M15 9.5h.01"/></svg>
export const User = (p) => <svg {...base} {...p}><circle cx="12" cy="8" r="4"/><path d="M4 21c1.2-4.2 4.2-6.2 8-6.2s6.8 2 8 6.2"/></svg>
export const SoundOn = (p) => <svg {...base} {...p}><path d="M4 9.5h3.5L12 5v14l-4.5-4.5H4z"/><path d="M15.5 9a4.5 4.5 0 0 1 0 6M18 6.5a8 8 0 0 1 0 11"/></svg>
export const SoundOff = (p) => <svg {...base} {...p}><path d="M4 9.5h3.5L12 5v14l-4.5-4.5H4z"/><path d="m16 9.5 5 5M21 9.5l-5 5"/></svg>
export const Brush = (p) => <svg {...base} {...p}><path d="M14.5 4.5 19.5 9.5 11 18l-5-5z"/><path d="M6 13c-2.5 0-3 2.5-3 5.5 2.6 0 5.5-.6 5.5-3"/></svg>
export const Search = (p) => <svg {...base} {...p}><circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 4.4 4.4"/></svg>
export const Expand = (p) => <svg {...base} {...p}><path d="M9 4H4v5M15 4h5v5M4 15v5h5M20 15v5h-5"/></svg>
export const Stage = (p) => <svg {...base} {...p}><path d="M3 20h18M5 20v-5h4v5M10 20V12h4v8M15 20v-3h4v3M12 4l1.2 2.6 2.8.3-2.1 1.9.6 2.8-2.5-1.5-2.5 1.5.6-2.8L8 6.9l2.8-.3z"/></svg>
export const Compass = (p) => <svg {...base} {...p}><circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2 5-5 2 2-5z"/></svg>
export const Replay = (p) => <svg {...base} {...p}><path d="M4 12a8 8 0 1 0 2.4-5.7"/><path d="M4 4v4.5h4.5"/></svg>
export const Eye = (p) => <svg {...base} {...p}><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z"/><circle cx="12" cy="12" r="3"/></svg>
export const Cube = (p) => <svg {...base} {...p}><path d="M12 3 20 7.5v9L12 21l-8-4.5v-9z"/><path d="M4 7.5 12 12l8-4.5M12 12v9"/></svg>
