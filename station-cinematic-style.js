// Presentation-only treatment for the supplied intro. The archive's UI and CSS stay intact.
export const CINEMATIC_CSS = `
.st-intro { isolation:isolate; overflow:hidden; }
.st-intro::before {
  content:""; position:absolute; inset:0; z-index:0; pointer-events:none;
  background:
    radial-gradient(ellipse 56% 42% at 50% 48%, rgba(2,8,22,.82), rgba(2,8,22,.38) 70%, transparent),
    linear-gradient(90deg, rgba(1,4,13,.38), transparent 25%, transparent 75%, rgba(1,4,13,.38)),
    linear-gradient(180deg, rgba(1,4,13,.34), transparent 22%, transparent 78%, rgba(1,4,13,.5));
  animation:hs-cine-veil 4s ease-out both;
}
.st-intro::after {
  content:""; position:absolute; inset:0; z-index:0; pointer-events:none;
  background:linear-gradient(#02050de8,#02050de8) top/100% clamp(18px,4.5vh,42px) no-repeat,
             linear-gradient(#02050de8,#02050de8) bottom/100% clamp(18px,4.5vh,42px) no-repeat;
}
.st-intro > div { position:relative; z-index:1; width:min(1640px,calc(100% - 42px)); padding:30px 0 46px; }
.st-intro > div::before, .st-intro > div::after {
  content:""; display:block; width:clamp(56px,11vw,160px); height:1px; margin:0 auto 30px;
  background:linear-gradient(90deg,transparent,#a6e3ff,transparent); opacity:.9;
  box-shadow:0 0 22px #6fd3ff9c;
}
.st-intro > div::after { margin:32px auto 0; opacity:.45; }
.st-intro h1 { color:#f5faff; font-size:clamp(44px,6.1vw,104px); white-space:nowrap; text-shadow:0 2px 18px #02040ae0, 0 0 48px #53bbef91; }
.st-intro .kicker { color:#a9d7ec; letter-spacing:.3em; text-shadow:0 0 14px #5ab9e599; }
.st-intro .sub { color:#c7d9e4; text-shadow:0 2px 12px #02040a; }
.st-intro .start { border:1px solid #e9faff; box-shadow:0 0 0 1px #6fd3ff44, 0 0 36px #61c9ff66; }
.st-intro .start:hover { box-shadow:0 0 0 1px #e9faff, 0 0 48px #61c9ffaf; }
.st-intro .st-skip { z-index:2; text-shadow:0 1px 8px #000; }
@keyframes hs-cine-veil { from { opacity:.32; } to { opacity:1; } }
@media (max-width:760px) {
  .st-intro > div { width:calc(100% - 30px); padding:20px 0 34px; }
  .st-intro > div::before { margin-bottom:22px; }
  .st-intro > div::after { margin-top:24px; }
  .st-intro h1 { display:flex; flex-wrap:wrap; justify-content:center; white-space:normal; font-size:clamp(33px,8.5vw,58px); line-height:1.08; letter-spacing:.04em; }
  .st-intro h1 span:nth-child(10) { flex-basis:100%; width:0; height:0; overflow:hidden; }
  .st-intro .kicker { font-size:9px; letter-spacing:.16em; }
  .st-intro .sub { line-height:1.5; letter-spacing:.28em; }
  .st-intro .start { margin-top:38px; }
}
@media (prefers-reduced-motion:reduce) {
  .st-intro::before { animation:none; }
  .st-intro h1 span, .st-intro .kicker, .st-intro .sub, .st-intro .start { transition-duration:.01ms !important; transition-delay:0ms !important; animation:none !important; }
}
`;
