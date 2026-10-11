export const TOOLS_CSS = `
.st-modal-back{position:absolute;inset:0;z-index:20;display:grid;place-items:center;padding:16px;background:#0009;backdrop-filter:blur(12px)}
.st-modal{position:relative;width:min(550px,100%);max-height:90%;overflow:auto;padding:28px;background:var(--paper);color:var(--ink);box-shadow:0 30px 70px #000a}
.st-modal h2{margin:10px 0 24px;font:300 clamp(30px,5vw,42px)/1 var(--font)}
.st-modal .st-overline{color:var(--ink-2)}
.st-close{position:absolute;right:15px;top:12px;border:0;background:var(--tag);color:#fff;font-size:25px!important;cursor:pointer}
.st-leaders{list-style:none;padding:0;margin:0}
.st-leaders li{display:flex;align-items:center;gap:13px;min-height:44px;border-top:1px solid var(--line);font:600 12px var(--font)}
.st-leaders li span{color:var(--ink-2)}.st-leaders li i{width:14px;height:14px;border-radius:50%;box-shadow:0 0 12px currentColor}
.st-leaders li b{flex:1}.st-leaders li em{font-style:normal;color:var(--ink)}

.hs-tools { position:fixed; z-index:20; right:16px; bottom:max(16px,var(--mobius-safe-bottom,0px)); font-family:var(--font); color:var(--ink); }
.hs-tools summary,.hs-tools button { cursor:pointer; min-height:44px; padding:10px 14px; border:0; border-left:3px solid var(--orange); background:var(--paper); color:var(--ink); box-shadow:0 18px 40px rgba(0,0,0,.28); font:600 11px var(--font); letter-spacing:.1em; }
.hs-tools summary:hover,.hs-tools button:hover { background:#fff; }
.hs-tools summary:focus-visible,.hs-tools button:focus-visible,.st-close:focus-visible { outline:2px solid var(--orange); outline-offset:2px; }
.hs-tools summary { display:flex; align-items:center; justify-content:center; }
.hs-tools nav { display:grid; gap:4px; margin-bottom:4px; }
.hs-tools[open] { display:flex; flex-direction:column-reverse; }
.hs-overlay { position:fixed; inset:0; z-index:50; --hg-font:var(--font); font-family:var(--font); }
.hs-overlay button,.hs-overlay input,.hs-overlay textarea { font-family:inherit; }
.hs-overlay .st-modal { color:var(--ink); }
.hs-overlay .st-close { min-width:44px; min-height:44px; }
.hs-overlay p,.hs-overlay li { line-height:1.5; }
.hs-status { position:fixed; inset:0; z-index:60; display:grid; place-content:center; gap:16px; text-align:center; padding:24px; background:#02040a; color:#edf7ff; font:16px var(--font); }
.hs-notice { position:fixed; z-index:70; left:50%; top:100px; transform:translateX(-50%); max-width:90vw; padding:12px; color:#fff; background:#40251b; font:14px var(--font); }
.hs-notice button { margin-left:10px; min-height:44px; }
.hs-refresh { position:absolute; z-index:60; bottom:0; left:0; right:0; padding:10px; background:var(--paper); color:var(--ink); border-top:3px solid var(--orange); text-align:center; font:12px var(--font); }
.hs-sound { display:grid; gap:6px; width:190px; padding:11px 13px 9px; background:var(--paper); border-left:3px solid var(--orange); box-shadow:0 18px 40px rgba(0,0,0,.28); }
.hs-sound button { min-height:0; padding:0; border:0; background:none; box-shadow:none; color:var(--ink); font:700 11px var(--font); letter-spacing:.1em; text-align:left; }
.hs-sound button:hover { background:none; color:var(--orange); }
.hs-sound button[aria-pressed=false] { color:var(--ink-2); }
.hs-sound input[type=range] { width:100%; height:20px; margin:0; accent-color:var(--orange); background:transparent; }
.hs-run { position:fixed; z-index:30; left:50%; bottom:max(18px,var(--mobius-safe-bottom,0px)); transform:translateX(-50%); display:grid; gap:7px; justify-items:start; width:min(370px,calc(100vw - 32px)); padding:12px 14px; color:var(--ink); background:var(--paper); border-left:4px solid var(--orange); box-shadow:0 18px 40px rgba(0,0,0,.32); font-family:var(--font); }
.hs-run b { font:700 12px/1.2 var(--font); letter-spacing:.12em; }
.hs-run span { color:var(--ink-2); font:400 12px/1.45 var(--font); }
.hs-run button { min-height:40px; padding:10px 15px; border:0; background:var(--tag); color:#fff; cursor:pointer; font:700 10px/1 var(--font); letter-spacing:.14em; }
.hs-run button:focus-visible { outline:2px solid var(--orange); outline-offset:2px; }
body:has(.hs-overlay) .hs-run { display:none; }
/* Keep the integration controls clear of the package's Start/Skip buttons and HUD. */
@media (min-width:761px) {
  body:has(.st-intro,.st-creator) .hs-tools { left:50%; right:auto; transform:translateX(-50%); }
  body:has(.st-flight) .hs-tools { top:16px; bottom:auto; }
}
@media (max-width:760px) {
  .hs-tools { right:10px; bottom:auto; top:max(130px,calc(120px + var(--mobius-safe-top,0px))); }
  .hs-sound { width:168px; }
  /* Clear the touch joystick and the fire/jump controls. */
  .hs-run { bottom:max(164px,calc(152px + var(--mobius-safe-bottom,0px))); width:min(320px,calc(100vw - 24px)); padding:10px 12px; }
}
`
