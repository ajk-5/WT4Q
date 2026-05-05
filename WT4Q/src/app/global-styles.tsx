import type { ReactElement } from 'react';

const globalCss = String.raw`
/* =====================================================================
   THE NINETIES TIMES — global tokens + shared retro design layer
   Anything prefixed .r- is a reusable 90s primitive available on any page.
   Any page-level CSS Module should pull from these tokens / primitives
   instead of redefining its own borders, shadows, palettes, or chrome.
   ===================================================================== */

:root {
  /* ---- Memphis-pop core palette ---- */
  --r-paper:        #fff7da;     /* warm yellow paper */
  --r-paper-2:      #fff0bf;
  --r-ink:          #0e0a1f;
  --r-pink:         #ff3ea5;
  --r-magenta:      #ff2bd6;
  --r-cyan:         #1ee3ff;
  --r-teal:         #19c8c8;
  --r-yellow:       #ffd633;
  --r-purple:       #7d4bff;
  --r-lime:         #6cf04a;
  --r-orange:       #ff7a2c;

  /* Win95 chrome (article view) */
  --r-win-face:     #d4cfc5;
  --r-win-shadow:   #6a6a6a;
  --r-win-light:    #ffffff;
  --r-win-titlebar: linear-gradient(90deg, #1f0040 0%, #6c0eb8 60%, #ff3ea5 100%);
  --r-paper-lined:  repeating-linear-gradient(
                      to bottom,
                      transparent 0 1.55rem,
                      rgba(30, 70, 200, 0.18) 1.55rem 1.6rem
                    );

  /* Pixel-art profile */
  --r-pixel-bg:     #1a1054;
  --r-pixel-bg-2:   #2a1a7a;
  --r-pixel-cyan:   #36e4ff;

  /* ---- Aliases used by legacy modules so nothing breaks ---- */
  --background: var(--r-paper);
  --foreground: var(--r-ink);
  --primary:    var(--r-pink);
  --secondary:  var(--r-cyan);
  --accent:     var(--r-yellow);
  --ink:        var(--r-ink);
  --muted:      #4a3f63;
  --surface:    rgba(255, 255, 255, 0.94);
  --surface-strong: #ffffff;
  --border:     var(--r-ink);
  --paper:      var(--r-paper);
  --paper-2:    var(--r-paper-2);

  --wt4q-yellow: var(--r-yellow);
  --wt4q-red:    var(--r-pink);
  --wt4q-blue:   #3a6bff;
  --wt4q-green:  #2cf4a9;
  --metal-base:  #ffffff;
  --metal-reflect: #ffffff;
  --metal-shadow: rgba(14, 10, 31, 0.2);
  --text-default: var(--r-ink);
  --text-light:   #4a3f63;
  --error-red:    #d92b4a;
  --metal-gradient: linear-gradient(135deg, var(--r-pink) 0%, var(--r-cyan) 100%);

  --bg1: var(--r-pink);
  --bg2: var(--r-cyan);
  --panel: rgba(14, 10, 31, 0.06);
  --panel-border: rgba(14, 10, 31, 0.2);

  /* ---- Layout + density ---- */
  --content-max: 1180px;
  --radius:    14px;
  --radius-sm: 10px;
  --radius-lg: 18px;
  --space-1: 0.25rem;
  --space-2: 0.5rem;
  --space-3: 0.75rem;
  --space-4: 1rem;
  --space-5: 1.4rem;
  --space-6: 2rem;

  --font-size-base: clamp(14px, 0.9rem + 0.25vw, 18px);
  --font-size-sm:   clamp(12px, 0.8rem + 0.1vw, 16px);
  --font-size-lg:   clamp(16px, 1rem + 0.5vw, 22px);
  --line-height: 1.55;

  --transition-fast: 120ms;

  /* Unified retro shadow system (chunky offset, no blur) */
  --r-shadow-1: 3px 3px 0 var(--r-ink);
  --r-shadow-2: 5px 5px 0 var(--r-ink);
  --r-shadow-3: 8px 8px 0 var(--r-ink);
  --r-shadow-soft: 6px 6px 0 rgba(14, 10, 31, 0.22);

  /* Legacy shadow aliases — keep modules that still reference them working */
  --shadow-elev:       0 10px 22px rgba(14, 10, 31, 0.22);
  --shadow-elev-lg:    0 18px 38px rgba(14, 10, 31, 0.28);
  --shadow-sticker:    var(--r-shadow-2);
  --shadow-sticker-lg: var(--r-shadow-3);

  /* Fonts (provided by next/font on <html>). Retro stack pulls VT323 first. */
  --font-inter:   var(--font-body, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif);
  --font-retro:   var(--font-display, "VT323", "Press Start 2P", ui-monospace, Menlo, Consolas, monospace);
  --font-system:  ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;

  --header-height: calc(clamp(1.35rem, 4.8vw, 3.1rem) * 1.05 + 5.25rem);
  --header-offset: calc(var(--header-height) - clamp(0.5rem, 1.8vw, 1.35rem));
}

* { box-sizing: border-box; margin: 0; padding: 0; }
html, body { height: 100%; }
html {
  color-scheme: light;
  -webkit-text-size-adjust: 100%;
  text-size-adjust: 100%;
}

body {
  color: var(--r-ink);
  background-color: var(--r-paper);
  font-family: var(--font-body, var(--font-system));
  font-size: var(--font-size-base);
  line-height: var(--line-height);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  max-width: 150vw;
  overflow-x: hidden;
  position: relative;
  min-height: 100svh;
  min-height: -webkit-fill-available;
  padding-top: var(--header-offset);
}

/* Memphis-pop shared backdrop: yellow paper + scattered geometric flecks
   (squiggles, dots, triangles, zig-zags). Lives behind every page. */
body::before {
  content: "";
  position: fixed;
  inset: 0;
  z-index: -1;
  background-color: var(--r-paper);
  background-image:
    radial-gradient(circle 5px at 8% 12%,  var(--r-pink)   100%, transparent 100%),
    radial-gradient(circle 3px at 22% 30%, var(--r-cyan)   100%, transparent 100%),
    radial-gradient(circle 4px at 78% 18%, var(--r-purple) 100%, transparent 100%),
    radial-gradient(circle 6px at 92% 42%, var(--r-yellow) 100%, transparent 100%),
    radial-gradient(circle 3px at 14% 72%, var(--r-magenta) 100%, transparent 100%),
    radial-gradient(circle 4px at 60% 88%, var(--r-cyan)   100%, transparent 100%),
    radial-gradient(circle 5px at 88% 78%, var(--r-pink)   100%, transparent 100%),
    radial-gradient(circle at 12% 18%, rgba(255, 62, 165, 0.18), transparent 36%),
    radial-gradient(circle at 88% 14%, rgba(30, 227, 255, 0.18), transparent 42%),
    radial-gradient(circle at 50% 92%, rgba(255, 214, 51, 0.16), transparent 48%),
    repeating-linear-gradient(45deg,
      rgba(14, 10, 31, 0.05) 0 2px, transparent 2px 16px);
  background-size: cover;
  background-repeat: no-repeat;
}

/* CRT scanlines */
body::after {
  content: "";
  position: fixed;
  inset: 0;
  z-index: -1;
  pointer-events: none;
  opacity: 0.07;
  background-image: repeating-linear-gradient(
    0deg, rgba(0, 0, 0, 0.55) 0 1px, transparent 1px 3px
  );
  mix-blend-mode: multiply;
}

@media (prefers-reduced-data: reduce) {
  body::before { background: var(--r-paper) !important; }
  body::after  { display: none !important; }
}

canvas, img, svg, video { max-width: 100%; height: auto; display: block; }
iframe, embed, object   { max-width: 100%; }
main > *                { min-width: 0; max-width: 100%; }
:where(main, section, article, aside, div, form, fieldset) { min-width: 0; }
:where(h1, h2, h3, h4, h5, h6, p, li, a, span) { overflow-wrap: anywhere; }

table { width: 100%; display: block; overflow-x: auto; border-collapse: collapse; }
pre   { max-width: 100%; overflow-x: auto; }
input, select, textarea, button { max-width: 100%; }

a { color: inherit; text-decoration: none; }
a:focus-visible, button:focus-visible {
  outline: 3px solid var(--r-yellow);
  outline-offset: 2px;
  border-radius: 8px;
}

h1, h2, h3, h4, h5, h6 {
  font-family: var(--font-retro);
  letter-spacing: 0.02em;
  color: var(--r-ink);
}

@media (prefers-reduced-motion: reduce) {
  * { animation: none !important; transition: none !important; }
}

main {
  width: min(var(--content-max), 100% - clamp(24px, 6vw, 64px));
  margin-inline: auto;
  margin-block-start: clamp(var(--space-3), 2vw, var(--space-4));
  margin-block-end:   clamp(var(--space-5), 4vw, var(--space-6));
}

.container {
  width: min(var(--content-max), 100% - clamp(24px, 6vw, 64px));
  margin-inline: auto;
}

.metallicBg { background: var(--metal-gradient); color: #fff; }
.rounded    { border-radius: 1rem; }
.shinyText {
  background: var(--metal-gradient);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  color: transparent;
}

/* =====================================================================
   .r-* RETRO PRIMITIVES — usable from any module via global classes
   ===================================================================== */

/* --- Chunky 90s sticker shadow used everywhere --- */
.r-shadow   { box-shadow: var(--r-shadow-2); }
.r-shadow-lg{ box-shadow: var(--r-shadow-3); }
.r-border   { border: 3px solid var(--r-ink); }
.r-border-double { border: 5px double var(--r-ink); }

/* --- Win95-style window chrome (article view, etc.) --- */
.r-window {
  background: var(--r-win-face);
  border: 2px solid var(--r-ink);
  box-shadow:
    inset -2px -2px 0 var(--r-win-shadow),
    inset  2px  2px 0 var(--r-win-light),
    var(--r-shadow-2);
  position: relative;
}
.r-window-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 0.4rem 0.6rem;
  background: var(--r-win-titlebar);
  color: #fff;
  font-family: var(--font-retro);
  font-size: 1.05rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  border-bottom: 2px solid var(--r-ink);
}
.r-window-bar-title {
  display: flex; align-items: center; gap: 0.45rem;
  min-width: 0;
}
.r-window-bar-pip {
  width: 1.05rem; height: 1.05rem;
  display: inline-flex; align-items: center; justify-content: center;
  background: var(--r-win-face);
  color: var(--r-ink);
  border: 2px solid var(--r-ink);
  box-shadow: inset -1px -1px 0 var(--r-win-shadow), inset 1px 1px 0 var(--r-win-light);
  font-family: var(--font-system);
  font-size: 0.7rem;
  font-weight: 900;
  line-height: 1;
}
.r-window-body {
  padding: clamp(0.9rem, 2.4vw, 1.4rem);
}

/* --- Sticker / badge (rotated tape label) --- */
.r-sticker {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.32rem 0.7rem;
  background: var(--r-yellow);
  color: var(--r-ink);
  border: 2px solid var(--r-ink);
  box-shadow: var(--r-shadow-1);
  font-family: var(--font-retro);
  font-size: 0.95rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  transform: rotate(-2deg);
}
.r-sticker--pink   { background: var(--r-pink);  color: #fff; }
.r-sticker--cyan   { background: var(--r-cyan);  color: var(--r-ink); }
.r-sticker--lime   { background: var(--r-lime);  color: var(--r-ink); }
.r-sticker--purple { background: var(--r-purple); color: #fff; }
.r-sticker--ink    { background: var(--r-ink);   color: var(--r-yellow); }

/* --- Chunky 90s button (Cool!👍 / Read more) --- */
.r-button,
button.r-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  font-family: var(--font-retro);
  font-size: 1.1rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  padding: 0.55rem 1rem;
  border: 3px solid var(--r-ink);
  background: var(--r-yellow);
  color: var(--r-ink);
  box-shadow: var(--r-shadow-2);
  cursor: pointer;
  transition: transform var(--transition-fast), box-shadow var(--transition-fast);
}
.r-button:hover { transform: translate(-1px, -1px); box-shadow: var(--r-shadow-3); }
.r-button:active{ transform: translate(2px, 2px);  box-shadow: var(--r-shadow-1); }
.r-button--pink  { background: var(--r-pink);  color: #fff; }
.r-button--cyan  { background: var(--r-cyan);  color: var(--r-ink); }
.r-button--ink   { background: var(--r-ink);   color: var(--r-yellow); }
.r-button--ghost { background: #fff;           color: var(--r-ink); }

/* --- Generic retro card (used as outer container for any tile) --- */
.r-card {
  background: #fff;
  border: 3px solid var(--r-ink);
  box-shadow: var(--r-shadow-2);
  padding: 1rem;
  position: relative;
}
.r-card--paper { background: var(--r-paper); }
.r-card--ink   { background: var(--r-ink);   color: var(--r-paper); }
.r-card--pink  { background: var(--r-pink);  color: #fff; }
.r-card--cyan  { background: var(--r-cyan);  color: var(--r-ink); }

/* --- Memphis scatter (squiggles + zig-zags + triangles, decorative) --- */
.r-memphis::before {
  content: "";
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  background-image:
    /* dots */
    radial-gradient(circle 4px at 8% 14%,  var(--r-pink)   100%, transparent 100%),
    radial-gradient(circle 3px at 92% 18%, var(--r-cyan)   100%, transparent 100%),
    radial-gradient(circle 5px at 14% 86%, var(--r-yellow) 100%, transparent 100%),
    radial-gradient(circle 3px at 90% 82%, var(--r-purple) 100%, transparent 100%),
    /* zig-zag lines */
    repeating-linear-gradient(45deg,
      rgba(14, 10, 31, 0.07) 0 2px, transparent 2px 18px),
    repeating-linear-gradient(-45deg,
      rgba(255, 62, 165, 0.1) 0 2px, transparent 2px 24px);
  opacity: 0.85;
}
.r-memphis > * { position: relative; z-index: 1; }

/* --- Pixel-art frame (profile page) --- */
.r-pixel-frame {
  background: var(--r-pixel-bg);
  color: #fff;
  border: 4px solid var(--r-ink);
  box-shadow:
    0 0 0 4px var(--r-pixel-cyan),
    0 0 0 8px var(--r-ink),
    var(--r-shadow-3);
  background-image:
    radial-gradient(circle 1.5px at 25% 25%, rgba(54, 228, 255, 0.45) 100%, transparent 100%),
    radial-gradient(circle 1.5px at 75% 75%, rgba(255, 62, 165, 0.4)  100%, transparent 100%);
  background-size: 18px 18px;
  position: relative;
}
.r-pixel-frame .r-window-bar {
  background: linear-gradient(90deg, #36e4ff, #7d4bff);
  color: var(--r-ink);
}

/* --- Lined-paper backdrop for article body --- */
.r-paper-lined {
  background-color: #fffaf0;
  background-image: var(--r-paper-lined);
  background-position: 0 0.4rem;
}

/* --- Marquee ticker (used in headers / vault) --- */
.r-ticker {
  background: var(--r-ink);
  color: var(--r-yellow);
  border: 3px solid var(--r-ink);
  box-shadow: var(--r-shadow-2);
  overflow: hidden;
  position: relative;
}
.r-ticker-track {
  display: flex; gap: 2.4rem;
  animation: r-ticker-scroll 24s linear infinite;
  width: max-content;
  padding: 0.55rem 0;
  font-family: var(--font-retro);
  font-size: 1.1rem;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  white-space: nowrap;
}
.r-ticker-item::before {
  content: "★";
  margin-right: 1.1rem;
  color: var(--r-pink);
}
@keyframes r-ticker-scroll { to { transform: translateX(-50%); } }

/* --- Big retro display title (THE NINETIES TIMES) --- */
.r-display {
  font-family: var(--font-retro);
  font-weight: 400;
  text-transform: uppercase;
  line-height: 0.9;
  color: var(--r-pink);
  text-shadow:
    3px 3px 0 var(--r-cyan),
    6px 6px 0 var(--r-ink);
  letter-spacing: 0.04em;
}
.r-display--ink   { color: var(--r-ink);    text-shadow: 3px 3px 0 var(--r-yellow), 6px 6px 0 var(--r-pink); }
.r-display--cyan  { color: var(--r-cyan);   text-shadow: 3px 3px 0 var(--r-pink),   6px 6px 0 var(--r-ink); }

/* --- Section heading wrapper with sticker badge --- */
.r-section-head {
  display: flex;
  align-items: baseline;
  gap: 0.85rem;
  flex-wrap: wrap;
}
.r-section-head h2,
.r-section-head h3 {
  font-family: var(--font-retro);
  text-transform: uppercase;
  font-size: clamp(1.5rem, 2.6vw, 2.1rem);
  letter-spacing: 0.06em;
  color: var(--r-ink);
}

hr {
  border: 0;
  height: 4px;
  background: repeating-linear-gradient(
    90deg, var(--r-ink) 0 8px, transparent 8px 16px
  );
  margin: var(--space-5) 0;
}

input, select, textarea {
  font-family: var(--font-body, var(--font-system));
  font-size: 1rem;
  color: var(--r-ink);
  background: #fff;
  border: 2px solid var(--r-ink);
  border-radius: 0;
  padding: 0.55rem 0.7rem;
  box-shadow: inset 2px 2px 0 rgba(14, 10, 31, 0.08);
}
input:focus-visible, select:focus-visible, textarea:focus-visible {
  outline: 3px solid var(--r-yellow);
  outline-offset: 2px;
}

/* Default button style — chunky 90s. Use .r-button for explicit retro buttons.
   Keep a sane default for any plain <button> in the app. */
button {
  padding: 0.55rem 0.95rem;
  font-family: var(--font-body, var(--font-system));
  font-size: clamp(0.8rem, 0.4rem + 0.3vw, 0.95rem);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  border: 2px solid var(--r-ink);
  border-radius: var(--radius-sm);
  cursor: pointer;
  background: linear-gradient(180deg, #ffffff 0%, var(--r-paper-2) 100%);
  color: var(--r-ink);
  box-shadow:
    inset 0 2px 0 rgba(255, 255, 255, 0.85),
    inset 0 -2px 0 rgba(14, 10, 31, 0.18),
    var(--r-shadow-1);
  transition: transform var(--transition-fast), box-shadow 200ms;
  -webkit-tap-highlight-color: transparent;
}
button:hover {
  transform: translate(-1px, -1px);
  box-shadow:
    inset 0 2px 0 rgba(255, 255, 255, 0.88),
    inset 0 -2px 0 rgba(14, 10, 31, 0.18),
    var(--r-shadow-2);
}
button:disabled { opacity: 0.6; cursor: not-allowed; }

@media (max-width: 1024px) {
  :root {
    --header-offset: calc(var(--header-height) - clamp(0.85rem, 2.75vw, 1.9rem));
  }
  main {
    margin-block-start: clamp(var(--space-3), 2.5vw, var(--space-4));
    margin-block-end:   clamp(var(--space-4), 3vw, var(--space-5));
  }
}

@media (max-width: 768px) {
  :root {
    --header-offset: calc(var(--header-height) - clamp(0.95rem, 3.25vw, 2.1rem));
  }
  main {
    width: min(var(--content-max), 100% - clamp(16px, 5vw, 40px));
    margin-block-start: clamp(var(--space-2), 2.5vw, var(--space-3));
    margin-block-end:   clamp(var(--space-4), 3vw, var(--space-5));
  }
  .r-display { text-shadow: 2px 2px 0 var(--r-cyan), 4px 4px 0 var(--r-ink); }
}

@media (max-width: 480px) {
  :root {
    --radius:    12px;
    --radius-sm: 9px;
    --header-offset: calc(var(--header-height) - clamp(1.05rem, 3.75vw, 2.3rem));
  }
  body  { font-size: clamp(14px, 3.5vw, 16px); }
  main  { width: min(var(--content-max), 100% - clamp(12px, 4.5vw, 28px)); }
  .r-window-bar      { font-size: 0.95rem; }
  .r-button          { font-size: 1rem; padding: 0.5rem 0.85rem; }
}

[data-component='breaking-bar'] {
  transition: opacity 160ms ease, transform 160ms ease, visibility 160ms ease;
}

html.header-scrolled [data-component='breaking-bar'] {
  opacity: 0;
  pointer-events: none;
  transform: translateY(-0.25rem);
  visibility: hidden;
}

.adsbygoogle { width: 100% !important; }
.adsbygoogle[data-ad-status='unfilled'],
.adsbygoogle[data-adsbygoogle-status='unfilled'] { display: none !important; }
`;

export function GlobalStyles(): ReactElement {
  return <style data-inline="global" dangerouslySetInnerHTML={{ __html: globalCss }} />;
}

export default GlobalStyles;
