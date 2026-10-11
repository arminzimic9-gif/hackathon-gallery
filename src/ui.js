// DOM overlays: fades, intro, pilot creator, explore HUD, flight HUD, art focus card.
import { SUITS, VISORS, HELMETS, INSIGNIA, insigniaSvg, randomPilot, cleanCallsign, createPilotViewer, drawPilotPortrait } from './pilot.js';
import { isTouch } from './engine.js';

const h = (html) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

export function createUI(root, { assetUrl } = {}) {
  if (isTouch()) root.classList.add('touch');
  const layer = h('<div class="st-layer"></div>'); root.appendChild(layer);
  const fade = h('<div class="st-fade"></div>'); root.appendChild(fade);

  async function fadeOut(white = false, ms = 600) { fade.classList.toggle('white', white); fade.style.transitionDuration = ms + 'ms'; fade.classList.add('on'); await wait(ms); }
  async function fadeIn(ms = 700) { fade.style.transitionDuration = ms + 'ms'; fade.classList.remove('on'); await wait(ms * 0.6); }
  function clear() { layer.innerHTML = ''; }

  // ------------------------------------------------------------ intro title
  function intro(onStart) {
    clear();
    const word = 'HACKATHON STATION';
    const letters = [...word].map((c, i) => `<span style="transition-delay:${0.6 + i * 0.07}s">${c === ' ' ? '&nbsp;' : c}</span>`).join('');
    const el = h(`<div class="st-intro">
      <div>
        <div class="kicker st-label">Möbius · Agentic AI Hackathon</div>
        <h1>${letters}</h1>
        <div class="sub">AGENTIC AI · 2026</div>
        <button class="st-btn start">${isTouch() ? 'Tap to start' : 'Press start'}</button>
      </div>
      <button class="st-btn st-skip">Skip ↦</button>
    </div>`);
    layer.appendChild(el);
    requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('show')));
    let done = false;
    const go = () => { if (done) return; done = true; removeEventListener('keydown', key); onStart(); };
    const key = (e) => { if (e.key === 'Enter' || e.key === ' ') go(); };
    el.querySelector('.start').onclick = go; el.querySelector('.st-skip').onclick = go;
    addEventListener('keydown', key);
  }

  // ------------------------------------------------------------ pilot creator
  const SPECIES = [
    { code: '2300.10', cls: 'S', lore: 'Sky-born ace. Fast reflexes, light armour.', stats: [['Speed', 92], ['Agility', 84], ['Shield', 46], ['Focus', 70]] },
    { code: '1747.12', cls: 'A', lore: 'Deep-water engineer. Built to take a hit.', stats: [['Speed', 64], ['Agility', 70], ['Shield', 90], ['Focus', 62]] },
    { code: '0440.01', cls: 'S', lore: 'Hive navigator. Sees every asteroid line.', stats: [['Speed', 78], ['Agility', 96], ['Shield', 52], ['Focus', 88]] },
  ];
  const SKILL_ICONS = ['M4 12 L12 4 L20 12 L12 20 Z M12 8 L16 12 L12 16 L8 12 Z', 'M3 13 L11 13 L9 21 L21 9 L13 9 L15 3 Z', 'M12 2 L21 7 L21 17 L12 22 L3 17 L3 7 Z M12 7 L16 9.5 L16 14.5 L12 17 L8 14.5 L8 9.5 Z'];
  function creator(initial, onDone, { xp = 0 } = {}) {
    clear();
    const p = { ...(initial || randomPilot()) };
    const lv = 1 + Math.floor(xp / 300);
    const el = h(`<div class="st-creator">
      <div class="bust"><canvas></canvas></div>
      <header class="st-cbar"><span class="tab"><svg viewBox="0 0 24 24"><path d="M15 4 L5 12 L15 20 Z"/></svg></span><h2>Your Pilot</h2>
        <div class="credits"><span class="gear"></span><b>${String(xp).padStart(4, '0')}</b><i>+</i></div></header>
      <aside class="species">
        <div class="classes">Species <span>S</span><em></em><span>A</span><small>B</small></div>
        ${HELMETS.map((n, i) => `<button class="card" data-v="${i}"><canvas></canvas><div><b>${n}</b><span>Pilot ${SPECIES[i].code}</span></div></button>`).join('')}
        <button class="card add rnd"><b>Randomize</b><i>+</i></button>
      </aside>
      <section class="sheet">
        <div class="head">
          <div class="lvl"><b>${String(lv).padStart(2, '0')}</b><span>Level</span></div>
          <div class="who"><input class="callsign" maxlength="14" autocomplete="off" spellcheck="false" aria-label="Callsign"><div class="cls"></div></div>
        </div>
        <p class="lore"></p>
        <div class="stats"></div>
        <div class="grp"><div class="cap">Suit · ship livery</div><div class="st-row" data-k="suit">${SUITS.map((c, i) => `<button class="sq swatch" data-v="${i}" style="--c:${c}" aria-label="suit ${i + 1}"></button>`).join('')}</div></div>
        <div class="grp"><div class="cap">Visor · engines</div><div class="st-row" data-k="visor">${VISORS.map((c, i) => `<button class="sq swatch" data-v="${i}" style="--c:${c}" aria-label="visor ${i + 1}"></button>`).join('')}</div></div>
        <div class="grp"><div class="cap">Insignia</div><div class="st-row" data-k="insignia">${INSIGNIA.map((_, i) => `<button class="sq skill" data-v="${i}">${insigniaSvg(i)}</button>`).join('')}</div></div>
        <button class="st-start ok"><span>Start</span></button>
      </section>
    </div>`);
    layer.appendChild(el);
    const input = el.querySelector('.callsign'); input.value = p.callsign;
    const viewer = createPilotViewer(el.querySelector('.bust canvas'), p, assetUrl);
    const ok = el.querySelector('.ok');
    let portraitSuit = -1;
    const portraits = () => {
      if (portraitSuit === p.suit) return; portraitSuit = p.suit;
      el.querySelectorAll('.species .card[data-v] canvas').forEach((c, i) => drawPilotPortrait(c, { ...p, helmet: i }, assetUrl));
    };
    const sync = () => {
      el.querySelectorAll('.st-row').forEach((row) => row.querySelectorAll('.sq').forEach((b) => b.classList.toggle('sel', +b.dataset.v === p[row.dataset.k])));
      el.querySelectorAll('.species .card[data-v]').forEach((b) => b.classList.toggle('sel', +b.dataset.v === p.helmet));
      const sp = SPECIES[p.helmet % 3];
      el.querySelector('.cls').innerHTML = `${HELMETS[p.helmet % 3]} · Class <b>${sp.cls}</b>`;
      el.querySelector('.lore').textContent = sp.lore;
      el.querySelector('.stats').innerHTML = sp.stats.map(([k, v]) => `<div class="stat"><span>${k}</span><b>${v}</b><i style="--w:${v}%"></i></div>`).join('');
      el.querySelectorAll('.sq.skill').forEach((b) => { b.style.color = b.classList.contains('sel') ? VISORS[p.visor] : ''; });
      ok.disabled = cleanCallsign(input.value).length < 2;
      viewer.set(p); portraits();
    };
    el.querySelectorAll('.st-row').forEach((row) => row.addEventListener('click', (e) => {
      const b = e.target.closest('.sq'); if (!b) return; p[row.dataset.k] = +b.dataset.v; sync();
    }));
    el.querySelectorAll('.species .card[data-v]').forEach((b) => (b.onclick = () => { p.helmet = +b.dataset.v; sync(); }));
    input.addEventListener('input', () => { ok.disabled = cleanCallsign(input.value).length < 2; });
    input.addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Enter' && !ok.disabled) ok.click(); });
    el.querySelector('.rnd').onclick = () => { Object.assign(p, randomPilot()); input.value = p.callsign; sync(); };
    ok.onclick = () => { p.callsign = cleanCallsign(input.value); viewer.dispose(); onDone(p); };
    sync();
  }

  // ------------------------------------------------------------ explore HUD
  let hud = null;
  function exploreHud(pilot, { objectives = [], xp = 0, where = '', hint = '', onFire = null, onJump = null, armed = false } = {}) {
    clear();
    hud = h(`<div class="st-hud">
      <div class="st-pilotcard st-glass"><div class="portrait"><canvas></canvas></div><div class="lvbox"><b class="lv">1</b><span>Level</span></div><div><div class="name"></div><div class="st-label">Pilot · XP</div><div class="st-xp"><i></i></div></div></div>
      <div class="st-location"><div class="st-tag">You are in</div><div class="where"></div></div>
      <div class="st-objectives st-glass"><div class="st-tag">Objectives</div><ul></ul></div>
      <div class="st-toasts"></div>
      <div class="st-crosshair"></div>
      <div class="st-prompt st-glass"><span class="txt"></span><button class="st-btn primary act">E · Use</button></div>
      <div class="st-hint"></div>
      <div class="st-touchbtns"><button class="st-btn jump">Jump</button><button class="st-btn orange fire">Fire</button></div>
      <div class="st-focus st-glass st-corners"><div class="st-label kind"></div><h3></h3><p></p><button class="st-btn close">Close</button></div>
    </div>`);
    layer.appendChild(hud);
    hud.querySelector('.name').textContent = pilot.callsign;
    drawPilotPortrait(hud.querySelector('.portrait canvas'), pilot, assetUrl);
    setWhere(where); setHint(hint); setObjectives(objectives); setXp(xp);
    hud.querySelector('.st-focus .close').onclick = () => hud.querySelector('.st-focus').classList.remove('on');
    hud.querySelector('.st-touchbtns .jump').onclick = () => onJump?.();
    const fb = hud.querySelector('.st-touchbtns .fire'); fb.onclick = () => onFire?.(); fb.style.display = armed ? '' : 'none';
    return hud;
  }
  const setWhere = (t) => hud && (hud.querySelector('.where').textContent = t);
  const setHint = (t) => hud && (hud.querySelector('.st-hint').innerHTML = t);
  function setObjectives(list) { if (!hud) return; hud.querySelector('.st-objectives ul').innerHTML = list.map((o) => `<li class="${o.done ? 'done' : ''}">${o.text}</li>`).join(''); }
  function setXp(xp) {
    if (!hud) return;
    const lv = 1 + Math.floor(xp / 300);
    hud.querySelector('.lv').textContent = String(lv).padStart(2, '0');
    hud.querySelector('.st-xp i').style.width = ((xp % 300) / 3) + '%';
  }
  function toast(text) { if (!hud) return; const t = h(`<div class="st-toast st-glass">${text}</div>`); hud.querySelector('.st-toasts').appendChild(t); setTimeout(() => t.remove(), 2700); }
  let promptAction = null;
  function prompt(text, label, action) {
    if (!hud) return;
    const el = hud.querySelector('.st-prompt');
    promptAction = action;
    if (!text) { el.classList.remove('on'); return; }
    el.querySelector('.txt').textContent = text;
    el.querySelector('.act').textContent = (isTouch() ? '' : 'E · ') + label;
    el.classList.add('on');
  }
  addEventListener('keydown', (e) => { if ((e.key === 'e' || e.key === 'E') && promptAction) promptAction(); });
  document.addEventListener('click', (e) => { if (e.target.closest?.('.st-prompt .act') && promptAction) promptAction(); });
  function focusCard(kind, title, text) {
    if (!hud) return;
    const f = hud.querySelector('.st-focus');
    f.querySelector('.kind').textContent = kind; f.querySelector('h3').textContent = title; f.querySelector('p').textContent = text;
    f.classList.add('on');
  }

  // ------------------------------------------------------------ flight HUD
  let fl = null;
  function flightHud(onBoost, onFire) {
    clear(); hud = null;
    fl = h(`<div class="st-flight">
      <div class="hit"></div>
      <div class="top st-glass">
        <div class="big"><b class="score">0</b><span>Score</span></div>
        <div class="bars">
          <div class="stat"><span>Time</span><b class="time">20.0</b><i class="tbar" style="--w:100%"></i></div>
          <div class="stat"><span>Shield</span><b class="shv">100</b><i class="shield" style="--w:100%"></i></div>
          <div class="stat"><span>Boost</span><b class="bov">100</b><i class="boostbar" style="--w:100%"></i></div>
        </div>
      </div>
      <div class="reticle"><i></i></div>
      <div class="pops"></div>
      <div class="msg"></div>
      <div class="st-flighthint">Mouse / WASD steer · Click or F fire · Space boost</div>
      <button class="st-btn orange boost">Boost</button>
      <button class="st-btn firebtn">Fire</button>
    </div>`);
    layer.appendChild(fl);
    const b = fl.querySelector('.boost');
    b.addEventListener('pointerdown', () => onBoost(true)); b.addEventListener('pointerup', () => onBoost(false)); b.addEventListener('pointerleave', () => onBoost(false));
    const fbt = fl.querySelector('.firebtn'); fbt.addEventListener('pointerdown', () => onFire?.());
    if (!isTouch()) { b.style.display = 'none'; fbt.style.display = 'none'; }
    return {
      set({ score, time, shield, boost }) {
        fl.querySelector('.score').textContent = score;
        fl.querySelector('.time').textContent = Math.max(0, time).toFixed(1);
        fl.querySelector('.tbar').style.setProperty('--w', Math.max(0, time) * 5 + '%');
        fl.querySelector('.shv').textContent = Math.round(shield);
        fl.querySelector('.shield').style.setProperty('--w', shield + '%');
        fl.querySelector('.bov').textContent = Math.round(boost);
        fl.querySelector('.boostbar').style.setProperty('--w', boost + '%');
      },
      pop({ x, y, points }) {
        const e = h(`<div class="pop" style="left:${x * 100}%;top:${y * 100}%">+${points}</div>`);
        fl.querySelector('.pops').appendChild(e); setTimeout(() => e.remove(), 900);
        const r = fl.querySelector('.reticle'); r.classList.remove('hitmark'); void r.offsetWidth; r.classList.add('hitmark');
      },
      msg(t) { fl.querySelector('.msg').textContent = t || ''; },
      hit() { const e = fl.querySelector('.hit'); e.classList.add('on'); setTimeout(() => e.classList.remove('on'), 120); },
    };
  }

  return { root, layer, fadeOut, fadeIn, clear, intro, creator, exploreHud, setWhere, setHint, setObjectives, setXp, toast, prompt, focusCard, flightHud, get hud() { return hud; } };
}
