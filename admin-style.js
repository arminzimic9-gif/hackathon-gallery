export const ADMIN_CSS = `
.hg-admin-scrim { position:absolute; inset:0; z-index:25; display:flex; justify-content:flex-end; background:rgba(1,5,6,.71); backdrop-filter:blur(7px); }
.hg-admin { width:min(640px,100%); height:100%; display:flex; flex-direction:column; overflow:hidden; color:#edf7e9; background:#0d1618; border-left:1px solid #597354; box-shadow:-20px 0 80px rgba(0,0,0,.5); animation:hg-admin-enter .55s both cubic-bezier(.14,.86,.18,1); }
@keyframes hg-admin-enter { from { transform:translateX(70px); opacity:0; } to { transform:translateX(0); opacity:1; } }
.hg-admin-head { display:flex; justify-content:space-between; padding:34px 34px 24px; padding-top:max(34px,calc(var(--mobius-safe-top,0px) + 20px)); border-bottom:1px solid #3c4c42; }
.hg-admin-head span { color:#d8ff69; font-size:10px; font-weight:900; letter-spacing:.2em; }
.hg-admin-head h2 { margin:11px 0 0; font-family:var(--hg-font);font-weight:700; font-size:50px; line-height:.95; letter-spacing:-.018em; }
.hg-admin-head h2 span { font:inherit; font-size:50px; }
.hg-admin-head>button { align-self:flex-start; width:44px; height:44px; border:1px solid #52674e; background:transparent; color:#d8ff69; font-size:27px; }
.hg-admin-tabs { display:flex; flex:0 0 auto; border-bottom:1px solid #3c4c42; }
.hg-admin-tabs button { position:relative; flex:1; min-height:56px; border:0; border-right:1px solid #26352d; background:#0e191a; color:#9fb1a2; font-size:10px!important; font-weight:900!important; letter-spacing:.1em; }
.hg-admin-tabs button.active { color:#d8ff69; background:#18251d; }
.hg-admin-tabs button.active::after { content:''; position:absolute; bottom:0; left:0; right:0; height:3px; background:#d8ff69; }
.hg-admin-tabs em { display:inline-grid; place-items:center; min-width:18px; height:18px; margin-left:5px; border-radius:50%; color:#0d1618; background:#d8ff69; font-style:normal; font-size:10px; }
.hg-admin-body { flex:1; min-height:0; overflow:auto; padding:28px 34px max(50px,calc(var(--mobius-safe-bottom,0px) + 35px)); scrollbar-color:#4b674f #0d1618; }
.hg-admin-section-title { display:flex; justify-content:space-between; align-items:flex-end; gap:15px; margin-bottom:24px; }
.hg-admin-section-title span { color:#d8ff69; font-size:10px; font-weight:900; letter-spacing:.2em; }
.hg-admin-section-title h3 { margin:7px 0 0; font-size:26px; letter-spacing:-.05em; }
.hg-admin-section-title small { margin-left:7px; color:#96ad9c; font-size:11px; font-weight:700; letter-spacing:0; }
.hg-admin-section-title>button { min-height:40px; padding:0 14px; border:1px solid #70896e; background:transparent; color:#e9f9e6; font-size:10px!important; font-weight:900!important; letter-spacing:.1em; }
.hg-admin-error,.hg-admin-success { margin-bottom:18px; padding:12px 14px; border:1px solid #ff8c8c; background:#381e22; color:#ffd8d8; font-size:12px; line-height:1.4; }
.hg-admin-success { border-color:#b4e978; background:#1b2b1f; color:#dcffc6; }
.hg-admin-form { padding:20px; border:1px solid #50664f; background:#15201e; }
.hg-admin-form-head { display:flex; justify-content:space-between; gap:8px; margin-bottom:17px; color:#d8ff69; font-size:11px; font-weight:900; letter-spacing:.13em; }
.hg-admin-form-head span { color:#9eb09f; font-size:9px; letter-spacing:.05em; text-align:right; }
.hg-admin-form-grid { display:grid; grid-template-columns:1fr 1fr; gap:11px; }
.hg-admin-form label,.hg-admin-edit label { display:block; margin-bottom:13px; color:#b5d0b9; font-size:9px; font-weight:900; letter-spacing:.15em; }
.hg-admin-form input:not([type=file]),.hg-admin-form textarea,.hg-admin-edit input,.hg-admin-edit textarea { display:block; width:100%; min-height:44px; margin-top:7px; padding:10px 11px; border:1px solid #526754; border-radius:0; outline:0; background:#0c1616; color:#f4f9f2; font-family:inherit; font-size:16px; font-weight:500; letter-spacing:0; resize:vertical; }
.hg-admin-form textarea,.hg-admin-edit textarea { min-height:74px; }
.hg-admin-form input:focus,.hg-admin-form textarea:focus,.hg-admin-edit input:focus,.hg-admin-edit textarea:focus { border-color:#d8ff69; box-shadow:0 0 0 1px #d8ff69; }
.hg-admin-sources { display:flex; align-items:center; gap:9px; margin:3px 0 16px; }
.hg-admin-sources>span { color:#91a492; font-size:9px; font-weight:800; }
.hg-admin-sources>input { flex:1; min-width:0; margin:0!important; }
.hg-admin-file { display:grid!important; place-items:center; flex:0 0 180px; min-height:44px; margin:0!important; border:1px solid #d8ff69; color:#d8ff69!important; text-align:center; cursor:pointer; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; padding:0 8px; }
.hg-admin-file input { position:absolute; width:1px; height:1px; opacity:0; }
.hg-admin-file:focus-within { outline:2px solid #d8ff69; outline-offset:2px; }
.hg-admin-submit { width:100%; min-height:48px; border:0; color:#112014; background:#d8ff69; font-size:11px!important; font-weight:900!important; letter-spacing:.14em; }
.hg-admin-submit:disabled { opacity:.45; cursor:not-allowed; }
.hg-admin-note { margin:18px 0 22px; color:#a8bcab; font-size:12px; line-height:1.6; }
.hg-admin-list { display:flex; flex-direction:column; gap:8px; }
.hg-admin-row { display:flex; gap:12px; min-height:95px; padding:11px; border:1px solid #3b5143; background:#111d1d; }
.hg-admin-thumb { flex:0 0 63px; height:72px; display:grid; place-items:end center; padding-bottom:7px; color:#132315; background:linear-gradient(140deg,#d8ff69 10%,#557c38 58%,#183025 59%); }
.hg-admin-thumb span { padding:3px 4px; background:#101b1b; color:#d8ff69; font-size:8px; font-weight:900; letter-spacing:.1em; }
.hg-admin-thumb-1,.hg-admin-thumb-5 { background:linear-gradient(145deg,#ff8b6a,#351e28 60%); }
.hg-admin-thumb-2,.hg-admin-thumb-7 { background:linear-gradient(145deg,#8871e8,#171a31 60%); }
.hg-admin-thumb-3,.hg-admin-thumb-8 { background:linear-gradient(145deg,#e8bd58,#42301c 60%); }
.hg-admin-thumb-4,.hg-admin-thumb-6 { background:linear-gradient(145deg,#74dfd4,#1c3739 60%); }
.hg-admin-row-main { min-width:0; flex:1; }
.hg-admin-row-top { display:flex; justify-content:space-between; gap:6px; align-items:flex-start; }
.hg-admin-row-top b { font-size:12px; line-height:1.25; }
.hg-admin-row-top small { color:#d8ff69; font-size:8px; font-weight:900; letter-spacing:.11em; }
.hg-admin-row-main p { margin:4px 0 10px; color:#a4b8a5; font-size:11px; }
.hg-admin-row-actions { display:flex; gap:5px; flex-wrap:wrap; }
.hg-admin-row-actions button { min-height:31px; padding:0 9px; border:1px solid #4c6551; background:#17261f; color:#deecda; font-size:9px!important; font-weight:900!important; letter-spacing:.08em; }
.hg-admin-row-actions button:disabled { opacity:.35; }
.hg-admin-row-actions button.hg-admin-danger { margin-left:auto; color:#ffc3c3; border-color:#7f5555; }
.hg-admin-confirm { display:flex; align-items:center; gap:8px; flex-wrap:wrap; margin-top:10px; padding:10px; background:#38221e; border:1px solid #a76c5e; font-size:11px; }
.hg-admin-confirm span { flex:1; min-width:120px; }
.hg-admin-confirm button { min-height:36px; border:1px solid #ff9c80; color:#ffdfd3; background:#41221b; font-size:10px!important; font-weight:900!important; }
.hg-admin-edit { margin-top:14px; }
.hg-admin-edit>button { min-height:40px; padding:0 13px; border:0; background:#d8ff69; color:#112014; font-size:10px!important; font-weight:900!important; }
.hg-admin-endpoint { margin-bottom:22px; padding:17px; background:#18251d; border:1px solid #546c50; }
.hg-admin-endpoint>span { color:#d8ff69; font-size:10px; font-weight:900; letter-spacing:.17em; }
.hg-admin-endpoint>div { display:flex; gap:8px; margin-top:9px; }
.hg-admin-endpoint code { flex:1; min-width:0; overflow:auto; padding:12px 8px; color:#f2ffe5; border:1px solid #61775e; font-size:11px; white-space:nowrap; user-select:all; }
.hg-admin-endpoint button { min-height:44px; padding:0 14px; border:0; background:#d8ff69; color:#112014; font-size:10px!important; font-weight:900!important; }
.hg-admin-endpoint p { color:#afc3b0; font-size:11px; line-height:1.55; margin:12px 0 0; }
.hg-admin-submission { padding:18px; border:1px solid #50664f; background:#14201d; margin-bottom:10px; }
.hg-admin-submission span { color:#d8ff69; font-size:9px; font-weight:900; letter-spacing:.15em; }
.hg-admin-submission h4 { font-size:19px; margin:7px 0 5px; }
.hg-admin-submission b { color:#d8e9d1; font-size:10px; letter-spacing:.12em; }
.hg-admin-submission p { color:#c2d0c0; font-size:12px; line-height:1.5; }
.hg-admin-submission small { color:#9eb5a3; font-size:10px; }
.hg-admin-review { display:flex; gap:8px; margin-top:14px; }
.hg-admin-review button { min-height:44px; padding:0 14px; border:1px solid #d8ff69; background:#d8ff69; color:#102014; font-size:10px!important; font-weight:900!important; letter-spacing:.1em; }
.hg-admin-review button+button { background:transparent; border-color:#a2756f; color:#f5bdb2; }
.hg-admin-review button:disabled { opacity:.4; }
.hg-admin-empty { padding:40px 24px; text-align:center; border:1px dashed #4c6550; }
.hg-admin-empty b { font-size:17px; }
.hg-admin-empty p { max-width:330px; margin:9px auto 0; color:#9eb4a1; font-size:12px; line-height:1.5; }
.hg-admin-ceremony-row { display:grid; grid-template-columns:1fr auto 128px; align-items:center; gap:8px; padding:11px 0; border-bottom:1px solid #344938; }
.hg-admin-ceremony-row b { display:block; font-size:12px; line-height:1.3; }
.hg-admin-ceremony-row small { display:block; color:#9db19f; font-size:10px; margin-top:4px; }
.hg-admin-ceremony-row button,.hg-admin-ceremony-row select { min-height:42px; padding:0 8px; border:1px solid #60775a; background:#17251e; color:#eaf7e7; font-size:9px!important; font-weight:900!important; letter-spacing:.05em; }
.hg-admin-ceremony-row button.selected { border-color:#d8ff69; color:#d8ff69; }
.hg-admin-ceremony-row select { max-width:128px; }
@media (max-width:760px) {
 .hg-admin { border-left:0; }
 .hg-admin-head { padding:calc(56px + var(--mobius-safe-top,0px)) 18px 17px; }
 .hg-admin-head h2 { font-size:38px; }
 .hg-admin-head h2 span { font-size:38px; }
 .hg-admin-body { padding:20px 16px max(30px,calc(var(--mobius-safe-bottom,0px) + 18px)); }
 .hg-admin-tabs button { min-height:48px; font-size:9px!important; }
 .hg-admin-form { padding:14px; }
 .hg-admin-form-grid { grid-template-columns:1fr; gap:0; }
 .hg-admin-form-head span { max-width:130px; }
 .hg-admin-sources { flex-wrap:wrap; }
 .hg-admin-file { flex:1; }
 .hg-admin-sources>input { flex:1 0 100%; }
 .hg-admin-ceremony-row { grid-template-columns:1fr 120px; }
 .hg-admin-ceremony-row button { grid-column:2; grid-row:1; }
 .hg-admin-ceremony-row select { grid-column:2; }
}
.hg-admin-code-row { display:grid; grid-template-columns:1fr auto auto; align-items:center; gap:8px; padding:10px 0; border-bottom:1px solid #344938; }
.hg-admin-code-row b { display:block; font-size:12.5px; letter-spacing:.08em; line-height:1.3; }
.hg-admin-code-row small { display:block; color:#9db19f; font-size:9.5px; margin-top:4px; letter-spacing:.06em; }
.hg-admin-code-row button { min-height:40px; padding:0 10px; border:1px solid #60775a; background:#17251e; color:#eaf7e7; font-size:9px!important; font-weight:900!important; letter-spacing:.06em; }
.hg-admin-code-row button.selected { border-color:#ffb489; color:#ffb489; }
.hg-admin-form-grid select { min-height:42px; padding:0 10px; border:1px solid #3d4f44; background:#101a18; color:#e8f3e4; font:inherit; font-size:11px; font-weight:700; letter-spacing:.08em; }
@media (max-width:760px) { .hg-admin-code-row { grid-template-columns:1fr auto; } .hg-admin-code-row button:last-child { grid-column:2; grid-row:2; } }
.hg-admin-room { min-height:36px; margin-left:auto; padding:0 8px; border:1px solid #3d4f44; background:#101a18; color:#e8f3e4; font:inherit; font-size:10px; font-weight:600; letter-spacing:.08em; }
`
