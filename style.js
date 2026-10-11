import { FONT_FAMILY } from './fonts.js'

// One type scale for the whole app (Inter, embedded): display / title /
// heading / body / small / label. Panels share one frosted-glass recipe.
export const CSS = `
:root { --hg-accent:#d8ff69; --hg-orange:#ff7a2f; --hg-bg:#05090d; --hg-ink:#f2f6f0; --hg-muted:#a9b5b0; --hg-font:'${FONT_FAMILY}',Inter,system-ui,sans-serif;
  --hg-ease:cubic-bezier(.16,1,.3,1); --hg-r:22px; --hg-safe-t:var(--mobius-safe-top,0px); --hg-safe-b:var(--mobius-safe-bottom,0px); --hg-safe-l:var(--mobius-safe-left,0px); --hg-safe-r:var(--mobius-safe-right,0px); }
* { box-sizing:border-box; }
.hg-root { position:relative; width:100%; height:100dvh; overflow:hidden; color:var(--hg-ink); background:var(--hg-bg); font-family:var(--hg-font); font-feature-settings:'ss01','cv11'; -webkit-font-smoothing:antialiased; user-select:none; }
.hg-root button,.hg-root select { font:inherit; color:inherit; cursor:pointer; }
.hg-root button:focus-visible,.hg-root select:focus-visible { outline:2px solid var(--hg-accent); outline-offset:3px; }
.hg-root svg { display:block; flex:none; }
.hg-root.is-pointer .hg-world { cursor:pointer; }
.hg-t-display { font-weight:700; letter-spacing:-.055em; line-height:.86; }
.hg-t-title { margin:0; font-size:34px; font-weight:700; line-height:1.04; letter-spacing:-.035em; }
.hg-t-heading { font-size:20px; font-weight:700; line-height:1.15; letter-spacing:-.02em; }
.hg-t-body { margin:0; font-size:15px; font-weight:400; line-height:1.6; color:#c9d3ce; }
.hg-t-small { font-size:12.5px; font-weight:600; line-height:1.45; letter-spacing:.01em; }
.hg-t-label { font-size:10.5px; font-weight:600; line-height:1.2; letter-spacing:.22em; text-transform:uppercase; }
.hg-accent { color:var(--hg-accent); }
.hg-sr { position:absolute; width:1px; height:1px; overflow:hidden; clip:rect(0 0 0 0); white-space:nowrap; }
.hg-glass { background:linear-gradient(160deg,rgba(255,255,255,.1),rgba(255,255,255,.035)) ,rgba(16,22,26,.46); -webkit-backdrop-filter:blur(22px) saturate(165%); backdrop-filter:blur(22px) saturate(165%); border:1px solid rgba(255,255,255,.14); box-shadow:inset 0 1px 0 rgba(255,255,255,.14),0 18px 50px rgba(0,0,0,.34); border-radius:var(--hg-r); }
.hg-world,.hg-canvas { position:absolute; inset:0; width:100%; height:100%; display:block; }
.hg-world { touch-action:none; }
.hg-vignette,.hg-grain { position:absolute; inset:0; pointer-events:none; }
.hg-vignette { background:radial-gradient(ellipse at 50% 46%,transparent 42%,rgba(2,4,6,.28) 78%,rgba(2,4,6,.66) 100%); }
.hg-grain { opacity:.1; background-image:repeating-radial-gradient(circle at 17% 47%,transparent 0 1px,rgba(255,255,255,.12) 1.4px 1.8px,transparent 2.4px 5.4px); mix-blend-mode:screen; }
.hg-fade { position:absolute; inset:0; z-index:30; pointer-events:none; background:radial-gradient(circle at 50% 50%,color-mix(in srgb,var(--fade) 55%,white) 0%,var(--fade) 22%,#04070a 70%); animation:hgFadeIn .42s var(--hg-ease) both; }
.hg-fade.is-out { animation:hgFadeOut .55s var(--hg-ease) both; }
@keyframes hgFadeIn { from { opacity:0; transform:scale(1.25); filter:blur(18px); } to { opacity:1; transform:none; filter:none; } }
@keyframes hgFadeOut { from { opacity:1; } to { opacity:0; transform:scale(.92); filter:blur(14px); } }

/* Intro */
.hg-intro { position:absolute; inset:0; z-index:20; overflow:hidden; pointer-events:none; }
.hg-intro button { pointer-events:auto; }
.hg-intro.is-reveal { background:linear-gradient(90deg,rgba(3,6,9,.72) 0%,rgba(3,6,9,.4) 46%,transparent 80%); }
.hg-intro-flash { position:absolute; inset:0; background:radial-gradient(circle at 56% 50%,#fff 0%,#fff6e8 30%,#ffd8b0 55%,rgba(255,200,150,.6) 100%); transition:opacity .25s linear; }
.hg-intro-top { position:absolute; top:calc(32px + var(--hg-safe-t)); left:max(5.4%,calc(var(--hg-safe-l) + 22px)); display:flex; align-items:center; gap:14px; color:var(--hg-ink); }
.hg-intro-spark { width:16px; height:16px; color:var(--hg-orange); animation:hgSpin 9s linear infinite; }
@keyframes hgSpin { to { transform:rotate(360deg); } }
.hg-intro-caption { position:absolute; left:50%; bottom:calc(120px + var(--hg-safe-b)); transform:translateX(-50%); color:#d9d2c9; white-space:nowrap; animation:hgUp 1.4s .6s both var(--hg-ease); }
.hg-intro-center { position:absolute; top:50%; left:max(7.5%,calc(var(--hg-safe-l) + 24px)); transform:translateY(-46%); }
.hg-intro-kicker { display:flex; align-items:center; gap:16px; color:var(--hg-accent); margin-bottom:20px; animation:hgUp .9s .1s both var(--hg-ease); }
.hg-intro-kicker::before { content:''; width:40px; height:2px; background:var(--hg-accent); }
.hg-intro-title { display:flex; margin:0; font-size:clamp(64px,10.4vw,178px); font-weight:700; line-height:.84; letter-spacing:-.06em; white-space:nowrap; text-shadow:0 12px 40px rgba(0,0,0,.35); }
.hg-intro-title span { display:inline-block; animation:hgLetter 1s both var(--hg-ease); }
.hg-intro-year { margin-top:10px; font-size:clamp(100px,17vw,290px); font-weight:700; line-height:.84; letter-spacing:-.065em; color:var(--hg-accent); animation:hgUp 1.1s .75s both var(--hg-ease); }
.hg-intro-year span { color:transparent; -webkit-text-stroke:2px var(--hg-accent); }
.hg-intro-rule { margin-top:32px; width:min(560px,74vw); height:1px; background:rgba(216,255,105,.7); transform-origin:left; animation:hgRule 1.2s 1.1s both var(--hg-ease); }
.hg-intro-center p { margin:18px 0 0; color:#dbe4d5; animation:hgUp 1s 1.4s both var(--hg-ease); }
.hg-intro-skip { position:absolute; bottom:calc(40px + var(--hg-safe-b)); right:max(5.3%,calc(var(--hg-safe-r) + 20px)); display:flex; align-items:center; gap:14px; min-height:48px; padding:0 20px 0 24px; color:var(--hg-accent); border-radius:999px; font-size:11px; font-weight:600; letter-spacing:.2em; transition:transform .5s var(--hg-ease),background .4s; }
.hg-intro-skip svg { width:18px; height:18px; transition:transform .5s var(--hg-ease); }
.hg-intro-skip:hover { transform:translateY(-2px); background:rgba(216,255,105,.16); }
.hg-intro-skip:hover svg { transform:translateX(4px); }
.hg-intro-progress { position:absolute; bottom:0; left:0; right:0; height:2px; background:rgba(255,255,255,.08); }
.hg-intro-progress i { display:block; height:100%; background:linear-gradient(90deg,var(--hg-orange),var(--hg-accent)); transform-origin:left; animation:hgRule 10.8s linear both; }
@keyframes hgLetter { from { opacity:0; transform:translateY(70px) skewY(8deg); filter:blur(12px); } to { opacity:1; transform:none; filter:none; } }
@keyframes hgUp { from { opacity:0; transform:translateY(24px); } to { opacity:1; transform:none; } }
@keyframes hgRule { from { transform:scaleX(0); } to { transform:scaleX(1); } }

/* HUD */
.hg-topbar { position:absolute; z-index:6; top:calc(16px + var(--hg-safe-t)); left:max(20px,calc(var(--hg-safe-l) + 12px)); right:max(20px,calc(var(--hg-safe-r) + 12px)); display:flex; justify-content:space-between; align-items:flex-start; gap:12px; pointer-events:none; animation:hgUp .8s both var(--hg-ease); }
.hg-topbar>* { pointer-events:auto; }
.hg-brand { display:flex; align-items:center; gap:12px; padding:7px 18px 7px 7px; border-radius:999px; white-space:nowrap; }
.hg-brand-mark { display:grid; place-items:center; width:38px; height:38px; border-radius:50%; color:#0b1209; background:var(--hg-accent); box-shadow:0 0 22px rgba(216,255,105,.4); }
.hg-brand-mark svg { width:19px; height:19px; stroke-width:2.2; }
.hg-brand b { display:block; font-size:12.5px; font-weight:700; letter-spacing:.14em; }
.hg-brand small { display:block; margin-top:3px; color:var(--hg-muted); font-size:9.5px; font-weight:600; letter-spacing:.2em; }
.hg-top-actions { display:flex; align-items:center; gap:6px; padding:6px; border-radius:999px; }
.hg-count { padding:0 12px 0 14px; color:#d4e0d4; font-size:10.5px; font-weight:600; letter-spacing:.14em; white-space:nowrap; }
.hg-count b { color:var(--hg-accent); font-size:17px; font-weight:700; letter-spacing:0; }
.hg-count em { font-style:normal; }
.hg-icon-btn { display:grid; place-items:center; width:42px; height:42px; border:0; border-radius:50%; background:rgba(255,255,255,.07); transition:background .35s,transform .45s var(--hg-ease); }
.hg-icon-btn svg { width:19px; height:19px; }
.hg-icon-btn:hover { background:rgba(255,255,255,.16); transform:scale(1.06); }
.hg-chip { display:inline-flex; align-items:center; gap:9px; min-height:42px; padding:0 16px; border:0; border-radius:999px; background:rgba(255,255,255,.07); font-size:10.5px; font-weight:600; letter-spacing:.18em; transition:background .35s,transform .45s var(--hg-ease),box-shadow .4s; }
.hg-chip svg { width:17px; height:17px; }
.hg-chip:hover { background:rgba(255,255,255,.16); transform:translateY(-1px); }
.hg-root .hg-chip-accent { color:#0c140b; background:var(--hg-accent); box-shadow:0 0 26px rgba(216,255,105,.28); }
.hg-root .hg-chip-accent:hover { background:#e9ffb3; }
.hg-zone-id { position:absolute; z-index:4; left:max(28px,calc(var(--hg-safe-l) + 20px)); top:calc(96px + var(--hg-safe-t)); display:flex; flex-direction:column; gap:6px; text-shadow:0 2px 16px rgba(0,0,0,.6); animation:hgUp .9s .1s both var(--hg-ease); }
.hg-zone-id .hg-t-label { color:var(--zone,var(--hg-accent)); }
.hg-zone-id strong { font-size:26px; }
.hg-map { position:absolute; z-index:4; top:calc(88px + var(--hg-safe-t)); right:max(20px,calc(var(--hg-safe-r) + 12px)); width:156px; padding:12px 12px 8px; border-radius:20px; text-align:left; transition:transform .5s var(--hg-ease),border-color .4s; }
.hg-map:hover { transform:translateY(-2px); border-color:rgba(216,255,105,.45); }
.hg-map-label { display:block; color:var(--zone,var(--hg-accent)); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.hg-map svg { width:100%; height:auto; margin-top:6px; fill:rgba(255,255,255,.04); stroke:rgba(220,235,228,.38); stroke-width:1; }
.hg-map .hg-map-portal { stroke-width:3.5; stroke-linecap:round; }
.hg-map .hg-map-bay { fill:rgba(255,255,255,.08); }
.hg-map .hg-map-stage { fill:rgba(255,201,92,.15); stroke:rgba(255,201,92,.6); }
.hg-map .hg-map-view { fill:rgba(216,255,105,.22); stroke:none; }
.hg-map .hg-map-dot { fill:var(--hg-accent); stroke:#0b110d; stroke-width:2; filter:drop-shadow(0 0 4px var(--hg-accent)); }
.hg-guide { position:absolute; z-index:9; right:max(20px,calc(var(--hg-safe-r) + 12px)); top:calc(292px + var(--hg-safe-t)); width:290px; padding:10px; animation:hgUp .5s both var(--hg-ease); }
.hg-guide-head { display:flex; justify-content:space-between; align-items:center; padding:4px 4px 8px 10px; }
.hg-guide-head .hg-t-label { display:flex; align-items:center; gap:8px; color:var(--hg-accent); }
.hg-guide-head svg { width:15px; height:15px; }
.hg-guide-head button { display:grid; place-items:center; width:36px; height:36px; border:0; border-radius:50%; background:rgba(255,255,255,.06); }
.hg-guide-head button svg { width:16px; height:16px; }
.hg-guide>button { display:flex; align-items:center; gap:12px; width:100%; min-height:46px; padding:0 12px; border:0; border-radius:14px; background:transparent; text-align:left; transition:background .3s,transform .4s var(--hg-ease); }
.hg-guide>button i { width:9px; height:9px; border-radius:50%; background:var(--hue); box-shadow:0 0 12px var(--hue); }
.hg-guide>button b { flex:1; font-size:14px; font-weight:600; }
.hg-guide>button span { color:var(--hg-muted); }
.hg-guide>button:hover { background:rgba(255,255,255,.09); transform:translateX(3px); }
.hg-guide>button.is-here span { color:var(--hg-accent); }
.hg-guide-games { display:grid; grid-template-columns:repeat(3,1fr); gap:6px; margin:0 0 8px; }
.hg-guide-games button { display:flex; flex-direction:column; align-items:center; gap:7px; padding:10px 4px; border:0; border-radius:14px; background:rgba(255,255,255,.06); font-size:9px; font-weight:700; letter-spacing:.08em; transition:background .3s,transform .4s var(--hg-ease); }
.hg-guide-games button:hover { background:rgba(255,255,255,.14); transform:translateY(-2px); }
.hg-guide-games i { width:12px; height:12px; border-radius:3px; background:var(--hue); box-shadow:0 0 12px var(--hue); }
.hg-guide>button.hg-guide-browse { margin-bottom:6px; background:rgba(216,255,105,.12); color:var(--hg-accent); }
.hg-guide>button.hg-guide-browse svg { width:17px; height:17px; }
.hg-guide>button.hg-guide-browse b { color:var(--hg-ink); }
.hg-crosshair { position:absolute; top:50%; left:50%; z-index:3; width:8px; height:8px; margin:-4px 0 0 -4px; border:1.5px solid rgba(216,255,105,.75); border-radius:50%; box-shadow:0 0 10px rgba(216,255,105,.55); pointer-events:none; }
.hg-root.is-pointer .hg-crosshair { transform:scale(2.2); border-color:#fff; transition:transform .4s var(--hg-ease); }
.hg-bottom-left { position:absolute; z-index:4; bottom:calc(30px + var(--hg-safe-b)); left:max(28px,calc(var(--hg-safe-l) + 20px)); display:flex; flex-direction:column; gap:6px; text-shadow:0 2px 12px rgba(0,0,0,.7); animation:hgUp .8s .25s both var(--hg-ease); }
.hg-bottom-left small { color:var(--hg-muted); }
.hg-replay { position:absolute; z-index:4; bottom:calc(104px + var(--hg-safe-b)); left:max(28px,calc(var(--hg-safe-l) + 20px)); display:flex; align-items:center; gap:8px; min-height:36px; padding:0 14px; border-radius:999px; color:var(--hg-accent); font-size:10px; font-weight:600; letter-spacing:.18em; }
.hg-replay svg { width:14px; height:14px; }
.hg-quality { position:absolute; z-index:4; bottom:calc(26px + var(--hg-safe-b)); right:max(20px,calc(var(--hg-safe-r) + 12px)); display:flex; align-items:center; gap:10px; padding:6px 8px 6px 16px; border-radius:999px; }
.hg-quality .hg-t-label { color:var(--hg-accent); }
.hg-quality select { min-height:34px; border:0; border-radius:999px; padding:0 12px; background:rgba(255,255,255,.09); font-size:12px; font-weight:600; }
.hg-quality select option { color:#111; }
.hg-quality small { min-width:44px; color:var(--hg-muted); font-size:11px; font-weight:600; }
.hg-banner { position:absolute; z-index:35; top:calc(14px + var(--hg-safe-t)); left:50%; transform:translateX(-50%); width:min(500px,calc(100% - 26px)); display:flex; justify-content:space-between; align-items:center; gap:12px; padding:8px 8px 8px 18px; border-radius:18px; font-size:13px; }
.hg-banner button { display:grid; place-items:center; width:34px; height:34px; border:0; border-radius:50%; background:rgba(255,255,255,.08); }
.hg-banner svg { width:15px; height:15px; }
.hg-hint { position:absolute; z-index:8; left:50%; bottom:calc(28px + var(--hg-safe-b)); width:min(440px,calc(100% - 32px)); transform:translateX(-50%); padding:24px 26px; animation:hgUp .8s both var(--hg-ease); }
.hg-hint>b { display:block; margin:10px 0 8px; font-size:24px; }
.hg-hint p { margin-bottom:18px; }
.hg-hint-close { position:absolute; top:12px; right:12px; display:grid; place-items:center; width:36px; height:36px; border:0; border-radius:50%; background:rgba(255,255,255,.08); }
.hg-hint-close svg { width:16px; height:16px; }
.hg-joystick,.hg-mobile-ceremony { display:none; }
.hg-bottom-left,.hg-replay,.hg-crosshair,.hg-zone-id,.hg-quality { transition:opacity .5s var(--hg-ease),transform .5s var(--hg-ease); }
.hg-root.is-focused .hg-bottom-left,.hg-root.is-focused .hg-replay,.hg-root.is-focused .hg-crosshair,.hg-root.is-focused .hg-zone-id,.hg-root.is-focused .hg-quality,.hg-root.is-ceremony .hg-bottom-left { opacity:0; transform:translateY(8px); pointer-events:none; animation:none; }
.hg-ceremony-note { position:absolute; left:50%; top:19%; z-index:4; transform:translateX(-50%); display:flex; flex-direction:column; align-items:center; gap:7px; text-shadow:0 4px 14px #050909; pointer-events:none; }
.hg-ceremony-note span { color:var(--hg-accent); }
.hg-ceremony-note b { font-size:24px; font-weight:700; letter-spacing:.06em; }
.hg-ceremony-note>* { opacity:0; animation:hgNoteIn .9s var(--hg-ease) forwards; }
.hg-ceremony-note b { animation-delay:.08s; }
.hg-ceremony-note i { display:block; width:160px; height:2px; background:rgba(216,255,105,.2); position:relative; overflow:hidden; animation-delay:.16s; }
.hg-ceremony-note i::after { content:''; position:absolute; inset:0; background:var(--hg-accent); transform-origin:left; transform:scaleX(var(--p,0)); transition:transform .8s var(--hg-ease); }
.hg-ceremony-note.is-winner b { color:var(--hg-accent); font-size:32px; text-shadow:0 0 24px rgba(216,255,105,.45),0 4px 12px #050909; }
@keyframes hgNoteIn { from { opacity:0; transform:translateY(14px); filter:blur(6px); } to { opacity:1; transform:none; filter:none; } }
.hg-egg-toast { position:absolute; left:50%; top:30%; z-index:12; display:flex; flex-direction:column; align-items:center; gap:7px; padding:18px 34px; pointer-events:none; animation:hgToast 2.6s var(--hg-ease) forwards; }
.hg-egg-toast b { font-size:30px; font-weight:700; letter-spacing:.02em; }
.hg-egg-toast small { color:var(--hg-muted); }
@keyframes hgToast { 0% { opacity:0; transform:translate(-50%,16px) scale(.92); } 14% { opacity:1; transform:translate(-50%,0) scale(1); } 78% { opacity:1; transform:translate(-50%,0); } 100% { opacity:0; transform:translate(-50%,-10px); } }

/* Focus mode */
.hg-focus { position:absolute; inset:0; z-index:10; pointer-events:none; }
.hg-focus>* { pointer-events:auto; }
.hg-fx-tools { position:absolute; left:max(22px,calc(var(--hg-safe-l) + 14px)); top:50%; transform:translateY(-50%); display:flex; flex-direction:column; gap:6px; padding:6px; border-radius:999px; animation:hgSlideR .7s both var(--hg-ease); }
.hg-fx-tools>button { display:grid; place-items:center; width:46px; height:46px; border:0; border-radius:50%; background:transparent; transition:background .3s,transform .45s var(--hg-ease),color .3s; }
.hg-fx-tools>button svg { width:21px; height:21px; }
.hg-fx-tools>button:hover { background:rgba(255,255,255,.12); transform:scale(1.07); }
.hg-fx-tools>button.is-on { color:#0c140b; background:var(--hg-accent); }
.hg-fx-pop { position:absolute; left:calc(100% + 10px); top:0; padding:8px; border-radius:20px; animation:hgPop .45s both var(--hg-ease); }
.hg-fx-tray { display:flex; gap:4px; }
.hg-fx-tray button,.hg-fx-reacts button { position:relative; display:grid; place-items:center; min-width:46px; height:46px; border:0; border-radius:16px; background:rgba(255,255,255,.07); font-size:21px; transition:transform .4s var(--hg-ease),background .3s; }
.hg-fx-tray button:hover,.hg-fx-reacts button:hover { transform:translateY(-4px) scale(1.08); background:rgba(255,255,255,.15); }
.hg-fx-tray small,.hg-fx-reacts small { position:absolute; right:3px; bottom:2px; font-size:10px; font-weight:700; color:var(--hg-accent); }
.hg-fx-author { display:flex; flex-direction:column; gap:5px; min-width:220px; padding:14px 18px; }
.hg-fx-author .hg-t-label { color:var(--hg-accent); }
.hg-fx-author b { font-size:17px; }
.hg-fx-author small { color:var(--hg-muted); font-size:12px; }
.hg-fx-card { position:absolute; right:max(26px,calc(var(--hg-safe-r) + 16px)); top:calc(96px + var(--hg-safe-t)); width:min(380px,32vw); padding:26px 26px 22px; border-radius:28px; animation:hgSlideL .7s both var(--hg-ease); }
.hg-fx-card h2 { margin:12px 44px 12px 0; }
.hg-fx-close { position:absolute; top:16px; right:16px; display:grid; place-items:center; width:38px; height:38px; border:0; border-radius:50%; background:rgba(255,255,255,.09); transition:background .3s,transform .4s var(--hg-ease); }
.hg-fx-close:hover { background:rgba(255,255,255,.18); transform:rotate(90deg); }
.hg-fx-close svg { width:17px; height:17px; }
.hg-fx-reacts { display:flex; gap:6px; margin-top:18px; padding-top:16px; border-top:1px solid rgba(255,255,255,.1); }
.hg-cover { position:absolute; left:50%; bottom:calc(98px + var(--hg-safe-b)); width:min(900px,100%); height:170px; transform:translateX(-50%); perspective:1200px; perspective-origin:50% 30%; touch-action:pan-y; }
.hg-cover-card { position:absolute; left:50%; top:10px; width:116px; height:146px; margin-left:-58px; padding:0; border:1px solid rgba(255,255,255,.2); border-radius:16px; overflow:hidden; background:#111a1d; transform-style:preserve-3d;
  transform:translateX(calc(var(--o) * 108px)) translateZ(calc(var(--abs) * -120px)) rotateY(calc(var(--o) * -30deg)); opacity:calc(1 - var(--abs) * .2); transition:transform .7s var(--hg-ease),opacity .6s,box-shadow .5s; box-shadow:0 14px 34px rgba(0,0,0,.45); }
.hg-cover-card img { width:100%; height:100%; object-fit:cover; pointer-events:none; }
.hg-cover-card i { position:absolute; inset:0; background:linear-gradient(135deg,#243136,#0e1517); }
.hg-cover-card span { position:absolute; left:0; right:0; bottom:0; padding:22px 9px 8px; font-size:9px; font-weight:600; letter-spacing:.06em; line-height:1.25; text-align:left; text-transform:uppercase; background:linear-gradient(transparent,rgba(0,0,0,.78)); }
.hg-cover-card.is-center { transform:translateY(-8px) scale(1.16); border-color:var(--hg-accent); box-shadow:0 0 0 1px var(--hg-accent),0 0 34px rgba(216,255,105,.32),0 18px 40px rgba(0,0,0,.5); z-index:2; }
.hg-cover-card:not(.is-center):hover { transform:translateX(calc(var(--o) * 108px)) translateZ(calc(var(--abs) * -120px + 30px)) rotateY(calc(var(--o) * -24deg)); }
.hg-pill { position:absolute; left:50%; bottom:calc(26px + var(--hg-safe-b)); transform:translateX(-50%); display:flex; align-items:center; gap:12px; min-width:min(460px,calc(100% - 28px)); padding:7px; border-radius:999px; animation:hgUpC .7s .1s both var(--hg-ease); }
.hg-pill>button { display:grid; place-items:center; width:42px; height:42px; border:0; border-radius:50%; background:rgba(255,255,255,.08); transition:background .3s,transform .4s var(--hg-ease); }
.hg-pill>button:hover:not(:disabled) { background:rgba(255,255,255,.18); transform:scale(1.06); }
.hg-pill>button:disabled { opacity:.35; cursor:default; }
.hg-pill>button svg { width:19px; height:19px; }
.hg-pill-avatar { display:grid; place-items:center; width:40px; height:40px; border-radius:50%; color:#0c1210; font-size:13px; font-weight:700; box-shadow:inset 0 0 0 2px rgba(255,255,255,.35); }
.hg-pill-text { flex:1; min-width:0; display:flex; flex-direction:column; gap:2px; }
.hg-pill-text b { font-size:14px; font-weight:700; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.hg-pill-text small { color:var(--hg-muted); font-size:11.5px; font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.hg-pill-count { padding:0 6px; font-size:12px; font-weight:700; letter-spacing:.06em; color:var(--hg-accent); }
.hg-pill-count i { font-style:normal; color:var(--hg-muted); padding:0 3px; }
.hg-panorama-start { position:absolute; z-index:6; left:50%; bottom:calc(115px + var(--hg-safe-b)); transform:translateX(-50%); display:flex; flex-direction:column; align-items:center; gap:4px; min-width:190px; min-height:52px; padding:9px 18px; border-radius:18px; color:#f1f7ff; font-size:11px; font-weight:700; letter-spacing:.12em; white-space:nowrap; }
.hg-panorama-start small { color:#aebbd0; font-size:8px; letter-spacing:.1em; }
@keyframes hgSlideL { from { opacity:0; transform:translateX(40px); } to { opacity:1; transform:none; } }
@keyframes hgSlideR { from { opacity:0; transform:translate(-30px,-50%); } to { opacity:1; transform:translateY(-50%); } }
@keyframes hgUpC { from { opacity:0; transform:translate(-50%,24px); } to { opacity:1; transform:translateX(-50%); } }
@keyframes hgPop { from { opacity:0; transform:translateX(-8px) scale(.94); } to { opacity:1; transform:none; } }


/* Floors, style menu, lift ride */
.hg-floors { position:absolute; z-index:4; left:max(28px,calc(var(--hg-safe-l) + 20px)); top:calc(170px + var(--hg-safe-t)); display:flex; flex-direction:column; gap:4px; padding:5px; border-radius:999px; animation:hgUp .9s .2s both var(--hg-ease); }
.hg-floors button { width:40px; height:40px; border:0; border-radius:50%; background:transparent; font-size:12px; font-weight:700; letter-spacing:.04em; color:var(--hg-muted); transition:background .3s,color .3s,transform .45s var(--hg-ease); }
.hg-floors button:hover { background:rgba(255,255,255,.12); color:var(--hg-ink); transform:scale(1.06); }
.hg-floors button.is-here { color:#0b0f0c; background:var(--hue); box-shadow:0 0 18px color-mix(in srgb,var(--hue) 60%,transparent); }
.hg-root.is-focused .hg-floors { opacity:0; pointer-events:none; }
.hg-style-menu { position:absolute; z-index:9; right:max(20px,calc(var(--hg-safe-r) + 12px)); top:calc(88px + var(--hg-safe-t)); width:330px; padding:10px; animation:hgUp .5s both var(--hg-ease); }
.hg-style-menu .hg-guide-head svg { width:15px; height:15px; }
.hg-style-card { display:flex; align-items:center; gap:14px; width:100%; padding:10px; margin-top:4px; border:1px solid transparent; border-radius:16px; background:rgba(255,255,255,.04); text-align:left; transition:background .3s,border-color .3s,transform .45s var(--hg-ease); }
.hg-style-card:hover { background:rgba(255,255,255,.1); transform:translateX(3px); }
.hg-style-card.is-on { border-color:var(--hg-accent); background:rgba(216,255,105,.1); }
.hg-style-card b { display:block; font-size:15px; font-weight:700; }
.hg-style-card small { display:block; margin-top:3px; color:var(--hg-muted); font-size:12px; font-weight:400; line-height:1.4; }
.hg-style-swatch { flex:none; display:grid; grid-template-columns:1fr 1fr; width:52px; height:52px; border-radius:12px; overflow:hidden; box-shadow:inset 0 0 0 1px rgba(255,255,255,.2); }
.hg-style-swatch i:first-child { grid-row:span 2; }
.hg-style-swatch.is-voxel,.hg-style-swatch.is-retro { border-radius:4px; image-rendering:pixelated; }
.hg-style-fade { position:absolute; inset:0; z-index:31; display:grid; grid-template-columns:repeat(8,1fr); grid-template-rows:repeat(6,1fr); pointer-events:none; }
.hg-style-fade i { background:#05080b; animation:hgMosaic .76s steps(4,end) both; }
@keyframes hgMosaic { 0% { opacity:0; } 35% { opacity:1; } 65% { opacity:1; } 100% { opacity:0; } }
.hg-lift { position:absolute; inset:0; z-index:32; pointer-events:none; }
.hg-lift-doors { position:absolute; inset:0; display:flex; }
.hg-lift-doors i { flex:1; background:linear-gradient(90deg,#1d2529,#323d42 50%,#1d2529); box-shadow:inset 0 0 40px rgba(0,0,0,.5); animation:hgDoorL 2.2s var(--hg-ease) both; }
.hg-lift-doors i:last-child { animation-name:hgDoorR; }
@keyframes hgDoorL { 0% { transform:translateX(-100%); } 22%,72% { transform:none; } 100% { transform:translateX(-100%); } }
@keyframes hgDoorR { 0% { transform:translateX(100%); } 22%,72% { transform:none; } 100% { transform:translateX(100%); } }
.hg-lift-panel { position:absolute; left:50%; top:50%; transform:translate(-50%,-50%); display:flex; flex-direction:column; align-items:center; gap:12px; padding:20px 28px; animation:hgLiftPanel 2.2s var(--hg-ease) both; }
.hg-lift-panel .hg-t-label { color:var(--hg-accent); }
.hg-lift-floors { display:flex; gap:10px; }
.hg-lift-floors b { display:grid; place-items:center; width:54px; height:54px; border-radius:50%; font-size:17px; font-weight:700; color:var(--hg-muted); background:rgba(255,255,255,.06); }
.hg-lift-floors b.is-from { animation:hgFloorOff 1.6s var(--hg-ease) both; }
.hg-lift-floors b.is-to { animation:hgFloorOn 1.6s .55s var(--hg-ease) both; }
@keyframes hgFloorOn { from { background:rgba(255,255,255,.06); color:var(--hg-muted); } to { background:var(--hue); color:#0b0f0c; box-shadow:0 0 26px var(--hue); } }
@keyframes hgFloorOff { from { background:rgba(255,255,255,.3); color:var(--hg-ink); } to { background:rgba(255,255,255,.06); } }
@keyframes hgLiftPanel { 0%,15% { opacity:0; transform:translate(-50%,-44%); } 28%,75% { opacity:1; transform:translate(-50%,-50%); } 90%,100% { opacity:0; transform:translate(-50%,-56%); } }

/* Games */
.hg-g-scrim { position:absolute; inset:0; z-index:26; display:grid; place-items:center; padding:20px; background:radial-gradient(circle at 50% 40%,color-mix(in srgb,var(--g) 18%,transparent),rgba(3,4,8,.8)); -webkit-backdrop-filter:blur(8px); backdrop-filter:blur(8px); animation:hgFadeOut .01s reverse both; }
.hg-g-panel { position:relative; width:min(460px,100%); max-height:100%; overflow:auto; padding:30px 28px 24px; border-radius:28px; animation:hgUp .6s both var(--hg-ease); }
.hg-g-x { position:absolute; top:16px; right:16px; display:grid; place-items:center; width:38px; height:38px; border:0; border-radius:50%; background:rgba(255,255,255,.09); }
.hg-g-x svg { width:17px; height:17px; }
.hg-g-kicker { display:block; margin-top:18px; color:var(--g); }
.hg-g-kicker:first-of-type { margin-top:0; }
.hg-g-title { margin:10px 0 8px; font-size:44px; font-weight:700; letter-spacing:-.04em; line-height:1; text-shadow:0 0 30px color-mix(in srgb,var(--g) 50%,transparent); }
.hg-g-score { font-size:64px; color:var(--g); }
.hg-g-play { display:inline-flex; align-items:center; gap:12px; min-height:50px; margin-top:20px; padding:0 26px; border:0; border-radius:999px; background:var(--g); color:#07080c; font-size:13px; font-weight:700; letter-spacing:.2em; box-shadow:0 0 30px color-mix(in srgb,var(--g) 45%,transparent); transition:transform .45s var(--hg-ease); }
.hg-g-play svg { width:18px; height:18px; }
.hg-g-play:hover { transform:translateY(-2px) scale(1.03); }
.hg-g-board { margin:10px 0 0; padding:0; list-style:none; }
.hg-g-board li { display:flex; gap:12px; align-items:center; padding:8px 4px; border-bottom:1px solid rgba(255,255,255,.08); font-size:14px; }
.hg-g-board li span { width:24px; color:var(--g); font-size:11px; font-weight:700; }
.hg-g-board li b { flex:1; font-weight:600; }
.hg-g-board li em { font-style:normal; font-weight:700; font-variant-numeric:tabular-nums; }
.hg-g-board li.is-you { background:color-mix(in srgb,var(--g) 14%,transparent); }
.hg-g-empty { margin:10px 0 0; color:var(--hg-muted); }
.hg-g-name { margin-top:14px; }
.hg-g-name>div { display:flex; gap:8px; margin-top:8px; }
.hg-g-name input { flex:1; min-width:0; min-height:46px; padding:0 14px; border:1px solid rgba(255,255,255,.2); border-radius:14px; background:rgba(0,0,0,.3); color:var(--hg-ink); font:inherit; font-size:16px; outline:none; }
.hg-g-name input:focus { border-color:var(--g); }
.hg-g-name button { min-height:46px; padding:0 16px; border:0; border-radius:14px; background:var(--g); color:#07080c; font-size:11px; font-weight:700; letter-spacing:.14em; }
.hg-g-name small { display:block; margin-top:6px; color:#ff9a8a; }
.hg-g-game { align-content:center; gap:16px; }
.hg-g-hud { display:flex; align-items:center; gap:16px; padding:8px 8px 8px 20px; border-radius:999px; }
.hg-g-hud b,.hg-g-live b { font-size:22px; font-weight:700; font-variant-numeric:tabular-nums; color:var(--g); }
.hg-g-hud button,.hg-g-live button { display:grid; place-items:center; width:38px; height:38px; border:0; border-radius:50%; background:rgba(255,255,255,.1); }
.hg-g-hud svg,.hg-g-live svg { width:16px; height:16px; }
.hg-mm-grid { display:grid; grid-template-columns:repeat(var(--cols),minmax(0,1fr)); gap:12px; width:min(620px,100%); perspective:1000px; }
.hg-mm-card { position:relative; aspect-ratio:3/4; padding:0; border:0; background:none; transform-style:preserve-3d; transition:transform .6s var(--hg-ease); }
.hg-mm-card.is-up { transform:rotateY(180deg); }
.hg-mm-card.is-cursor { outline:2px solid var(--g); outline-offset:4px; border-radius:16px; }
.hg-mm-card:hover:not(.is-up) { transform:translateY(-4px) rotateY(8deg); }
.hg-mm-card>span { position:absolute; inset:0; border-radius:16px; overflow:hidden; backface-visibility:hidden; -webkit-backface-visibility:hidden; box-shadow:0 12px 26px rgba(0,0,0,.4); }
.hg-mm-back { display:grid; place-items:center; background:linear-gradient(145deg,rgba(255,255,255,.14),rgba(255,255,255,.04)),#151a24; border:1px solid rgba(255,255,255,.18); }
.hg-mm-back i { width:42%; aspect-ratio:1; border-radius:50%; border:2px solid var(--g); box-shadow:0 0 20px color-mix(in srgb,var(--g) 50%,transparent),inset 0 0 14px color-mix(in srgb,var(--g) 40%,transparent); }
.hg-mm-face { transform:rotateY(180deg); background:#0b0f12; }
.hg-mm-face img { width:100%; height:100%; object-fit:cover; }
.hg-mm-face small { position:absolute; left:0; right:0; bottom:0; padding:16px 8px 6px; font-size:9px; font-weight:600; letter-spacing:.05em; text-transform:uppercase; text-align:left; background:linear-gradient(transparent,rgba(0,0,0,.8)); }
.hg-mm-card.is-done .hg-mm-face { box-shadow:0 0 0 2px var(--g),0 0 26px color-mix(in srgb,var(--g) 50%,transparent); }
.hg-g-live { position:absolute; z-index:7; top:calc(84px + var(--hg-safe-t)); left:50%; transform:translateX(-50%); display:flex; align-items:center; gap:14px; padding:7px 7px 7px 20px; border-radius:999px; animation:hgUpC .5s both var(--hg-ease); }
.hg-g-live .hg-t-label:first-child { color:var(--g); }
.hg-g-meter { width:110px; height:6px; border-radius:6px; background:rgba(255,255,255,.12); overflow:hidden; }
.hg-g-meter i { display:block; height:100%; background:var(--g); transition:width .3s var(--hg-ease); }
.hg-g-dots { display:flex; gap:6px; }
.hg-g-dots i { width:10px; height:10px; border-radius:50%; background:rgba(255,255,255,.18); }
.hg-g-dots i.is-on { background:var(--g); box-shadow:0 0 10px var(--g); }
.hg-root.is-gaming .hg-zone-id,.hg-root.is-gaming .hg-bottom-left { opacity:.35; }

/* Per-style UI theming: the same components, re-skinned. */
.hg-root[data-style='voxel'] .hg-glass { border-radius:6px; background:rgba(40,32,24,.82); -webkit-backdrop-filter:none; backdrop-filter:none; border:3px solid #1c150f; box-shadow:inset 3px 3px 0 rgba(255,255,255,.18),inset -3px -3px 0 rgba(0,0,0,.35),0 8px 0 rgba(0,0,0,.35); }
.hg-root[data-style='voxel'] .hg-chip,.hg-root[data-style='voxel'] .hg-icon-btn,.hg-root[data-style='voxel'] .hg-floors button,.hg-root[data-style='voxel'] .hg-g-play,.hg-root[data-style='voxel'] .hg-pill>button { border-radius:4px; }
.hg-root[data-style='voxel'] .hg-mm-back { background:#6b5130; border:3px solid #3b2f26; border-radius:4px; image-rendering:pixelated; }
.hg-root[data-style='voxel'] .hg-mm-back i { border-radius:0; border-color:#f6d27a; }
.hg-root[data-style='retro'] .hg-glass { border-radius:0; background:#000; -webkit-backdrop-filter:none; backdrop-filter:none; border:4px solid #fcfcfc; box-shadow:6px 6px 0 #000; }
.hg-root[data-style='retro'] .hg-chip,.hg-root[data-style='retro'] .hg-icon-btn,.hg-root[data-style='retro'] .hg-floors button,.hg-root[data-style='retro'] .hg-g-play,.hg-root[data-style='retro'] .hg-pill>button,.hg-root[data-style='retro'] .hg-g-name input,.hg-root[data-style='retro'] .hg-g-name button { border-radius:0; }
.hg-root[data-style='retro'] .hg-chip-accent,.hg-root[data-style='retro'] .hg-g-play { background:#fcbc3c; color:#000; box-shadow:4px 4px 0 #c84c0c; }
.hg-root[data-style='retro'] .hg-mm-card>span { border-radius:0; }
.hg-root[data-style='retro'] .hg-mm-back { background:#fcbc3c; border:4px solid #000; }
.hg-root[data-style='retro'] .hg-mm-back i { border:0; border-radius:0; box-shadow:none; width:40%; aspect-ratio:auto; height:40%; background:linear-gradient(#fcfcfc,#fcfcfc) 50% 15%/40% 18% no-repeat,linear-gradient(#fcfcfc,#fcfcfc) 70% 40%/20% 30% no-repeat,linear-gradient(#fcfcfc,#fcfcfc) 50% 95%/20% 18% no-repeat; }
.hg-root[data-style='retro'] .hg-vignette,.hg-root[data-style='retro'] .hg-grain { display:none; }
@media (max-width:760px) {
 .hg-t-title { font-size:24px; }
 .hg-t-body { font-size:13.5px; line-height:1.5; }
 .hg-intro.is-reveal { background:linear-gradient(180deg,rgba(3,6,9,.35),rgba(3,6,9,.7)); }
 .hg-intro-top { left:24px; }
 .hg-intro-caption { bottom:calc(130px + var(--hg-safe-b)); font-size:9.5px; }
 .hg-intro-center { left:24px; right:18px; top:46%; }
 .hg-intro-title { font-size:clamp(50px,14vw,88px); }
 .hg-intro-year { font-size:clamp(112px,30vw,210px); }
 .hg-intro-skip { right:20px; }
 .hg-topbar { left:10px; right:10px; top:calc(10px + var(--hg-safe-t)); gap:6px; }
 .hg-brand { padding:5px; }
 .hg-brand>span:last-child { display:none; }
 .hg-brand-mark { width:36px; height:36px; }
 .hg-top-actions { gap:4px; padding:5px; }
 .hg-count { padding:0 6px 0 8px; font-size:9.5px; }
 .hg-count em { display:none; }
 .hg-icon-btn { width:38px; height:38px; }
 .hg-chip { min-height:38px; padding:0 12px; font-size:9.5px; letter-spacing:.12em; }
 .hg-chip.hg-show { display:none; }
 .hg-zone-id { top:calc(70px + var(--hg-safe-t)); left:16px; }
 .hg-zone-id strong { font-size:20px; }
 .hg-map { top:calc(64px + var(--hg-safe-t)); right:10px; width:108px; padding:8px 8px 4px; border-radius:16px; }
 .hg-map-label { font-size:8.5px; letter-spacing:.14em; }
 .hg-floors { top:calc(124px + var(--hg-safe-t)); left:12px; padding:4px; }
 .hg-floors button { width:34px; height:34px; font-size:11px; }
 .hg-style-menu { right:10px; top:calc(64px + var(--hg-safe-t)); width:min(320px,calc(100% - 20px)); }
 .hg-g-title { font-size:34px; }
 .hg-g-score { font-size:52px; }
 .hg-mm-grid { gap:8px; }
 .hg-g-hud { gap:10px; padding-left:14px; }
 .hg-g-hud .hg-t-label:first-child { display:none; }
 .hg-g-live { top:calc(64px + var(--hg-safe-t)); gap:10px; padding-left:14px; max-width:calc(100% - 20px); }
 .hg-g-live .hg-t-label:last-of-type { display:none; }
 .hg-guide { right:10px; top:calc(206px + var(--hg-safe-t)); width:min(270px,calc(100% - 20px)); }
 .hg-bottom-left { display:none; }
 .hg-replay { bottom:calc(150px + var(--hg-safe-b)); left:16px; min-height:32px; font-size:8.5px; }
 .hg-quality { bottom:calc(20px + var(--hg-safe-b)); right:10px; padding:4px 4px 4px 10px; gap:6px; }
 .hg-quality .hg-t-label { display:none; }
 .hg-quality select { min-height:32px; font-size:11px; }
 .hg-quality small { min-width:36px; font-size:10px; }
 .hg-joystick { display:block; position:absolute; z-index:5; left:max(20px,calc(var(--hg-safe-l) + 10px)); bottom:calc(24px + var(--hg-safe-b)); width:112px; height:112px; border:1px solid rgba(255,255,255,.2); border-radius:50%; background:radial-gradient(circle,rgba(255,255,255,.08),rgba(255,255,255,.02)); -webkit-backdrop-filter:blur(14px); backdrop-filter:blur(14px); touch-action:none; }
 .hg-joystick-thumb { position:absolute; top:50%; left:50%; width:46px; height:46px; border-radius:50%; background:rgba(216,255,105,.85); box-shadow:0 0 24px rgba(216,255,105,.5); transform:translate(calc(-50% + var(--jx,0px)),calc(-50% + var(--jy,0px))); transition:transform .12s; }
 .hg-mobile-ceremony { display:block; position:absolute; z-index:5; left:0; right:0; width:max-content; margin:0 auto; bottom:calc(196px + var(--hg-safe-b)); min-height:44px; padding:0 20px; border:0; border-radius:999px; background:var(--hg-accent); color:#0c1411; font-size:10.5px; font-weight:700; letter-spacing:.16em; box-shadow:0 0 28px rgba(216,255,105,.3); animation:hgNoteIn .7s var(--hg-ease) both; }
 .hg-hint { bottom:calc(150px + var(--hg-safe-b)); padding:20px; }
 .hg-hint>b { font-size:20px; }
 .hg-ceremony-note { top:auto; bottom:calc(258px + var(--hg-safe-b)); width:90%; text-align:center; }
 .hg-ceremony-note b { font-size:16px; }
 .hg-ceremony-note.is-winner b { font-size:22px; }
 .hg-root.is-focused .hg-joystick,.hg-root.is-focused .hg-map { opacity:0; pointer-events:none; }
 .hg-fx-tools { top:calc(74px + var(--hg-safe-t)); transform:none; left:12px; padding:4px; animation:hgUp .6s both var(--hg-ease); }
 .hg-fx-tools>button { width:42px; height:42px; }
 .hg-fx-pop { left:calc(100% + 8px); }
 .hg-fx-card { left:12px; right:12px; top:auto; bottom:calc(254px + var(--hg-safe-b)); width:auto; padding:18px 18px 16px; border-radius:24px; animation:hgUp .6s both var(--hg-ease); }
 .hg-fx-card h2 { margin:8px 44px 8px 0; }
 .hg-fx-card .hg-t-body { display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; }
 .hg-fx-reacts { margin-top:12px; padding-top:12px; }
 .hg-fx-reacts button { min-width:42px; height:40px; font-size:19px; }
 .hg-fx-close { top:12px; right:12px; width:36px; height:36px; }
 .hg-cover { bottom:calc(84px + var(--hg-safe-b)); height:150px; }
 .hg-cover-card { width:92px; height:118px; margin-left:-46px; transform:translateX(calc(var(--o) * 78px)) translateZ(calc(var(--abs) * -110px)) rotateY(calc(var(--o) * -34deg)); }
 .hg-cover-card:not(.is-center):hover { transform:translateX(calc(var(--o) * 78px)) translateZ(calc(var(--abs) * -110px)) rotateY(calc(var(--o) * -34deg)); }
 .hg-pill { bottom:calc(16px + var(--hg-safe-b)); gap:8px; }
 .hg-pill>button { width:40px; height:40px; }
 .hg-pill-avatar { width:36px; height:36px; font-size:12px; }
}
@media (prefers-reduced-motion:reduce) {
 *,*::before,*::after { animation-duration:.01ms!important; transition-duration:.01ms!important; }
}
`
