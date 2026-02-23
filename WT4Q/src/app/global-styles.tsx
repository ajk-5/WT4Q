import type { ReactElement } from 'react';

const globalCss = String.raw`
/* Global baseline styles inlined to avoid a render-blocking stylesheet */

:root {
  /* Core palette (warm paper + neon accents) */
  --background: #fbf4e6;
  --foreground: #120b1f;
  --primary: #ff2fb2;
  --secondary: #00e7ff;
  --accent: #ffe600;
  --ink: #120b1f;
  --muted: #4a3f63;
  --surface: rgba(255, 255, 255, 0.92);
  --surface-strong: #ffffff;
  --border: #120b1f;
  --paper: #fff7ea;
  --paper-2: #f4ecd8;

  --wt4q-yellow: #ffd43b;
  --wt4q-red: #ff2fb2;
  --wt4q-blue: #3a6bff;
  --wt4q-green: #2cf4a9;
  --metal-base: #ffffff;
  --metal-reflect: #ffffff;
  --metal-shadow: rgba(18, 11, 31, 0.2);
  --text-default: #1b102a;
  --text-light: #4a3f63;
  --error-red: #d92b4a;
  --metal-gradient: linear-gradient(135deg, #ff2fb2 0%, #00e7ff 100%);

  --bg1: #ff2fb2;
  --bg2: #00e7ff;
  --panel: rgba(18, 11, 31, 0.06);
  --panel-border: rgba(18, 11, 31, 0.2);

  /* Layout + density */
  --content-max: 1120px;
  --radius: 14px;
  --radius-sm: 10px;
  --radius-lg: 18px;
  --space-1: 0.25rem;
  --space-2: 0.5rem;
  --space-3: 0.75rem;
  --space-4: 0.9rem;
  --space-5: 1.25rem;
  --space-6: 1.75rem;

  --font-size-base: clamp(14px, 0.9rem + 0.25vw, 18px);
  --font-size-sm: clamp(12px, 0.8rem + 0.1vw, 16px);
  --font-size-lg: clamp(16px, 1rem + 0.5vw, 22px);
  --line-height: 1.55;

  --transition-fast: 120ms;
  --shadow-elev: 0 10px 22px rgba(12, 7, 21, 0.22);
  --shadow-elev-lg: 0 18px 38px rgba(12, 7, 21, 0.28);
  --shadow-sticker: 6px 6px 0 rgba(18, 11, 31, 0.18);
  --shadow-sticker-lg: 10px 10px 0 rgba(18, 11, 31, 0.18);

  /* Fonts are provided by next/font via CSS variables on <html>.
     Keep aliases/fallbacks for modules that still reference --font-inter. */
  --font-inter: var(--font-body, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif);

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
  color: var(--foreground);
  background-color: var(--background);
  font-family: var(--font-body, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif);
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

body::before {
  content: "";
  position: fixed;
  inset: 0;
  z-index: -1;
  background-color: var(--background);
  background-image:
    radial-gradient(circle at 10% 18%, rgba(255, 47, 178, 0.18), transparent 46%),
    radial-gradient(circle at 85% 12%, rgba(0, 231, 255, 0.18), transparent 52%),
    radial-gradient(circle at 25% 85%, rgba(255, 230, 0, 0.12), transparent 55%),
    repeating-linear-gradient(135deg, rgba(18, 11, 31, 0.05) 0 2px, transparent 2px 12px),
    repeating-linear-gradient(0deg, rgba(18, 11, 31, 0.03) 0 1px, transparent 1px 4px);
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  will-change: transform;
}

body::after {
  /* subtle CRT scanlines */
  content: "";
  position: fixed;
  inset: 0;
  z-index: -1;
  pointer-events: none;
  opacity: 0.065;
  background-image: repeating-linear-gradient(
    0deg,
    rgba(0, 0, 0, 0.55) 0 1px,
    transparent 1px 3px
  );
  mix-blend-mode: multiply;
}

@media (prefers-reduced-data: reduce) {
  body::before {
    background: var(--background) !important;
  }
  body::after { display: none !important; }
}

canvas,
img,
svg,
video {
  max-width: 100%;
  height: auto;
  display: block;
}

iframe,
embed,
object {
  max-width: 100%;
}

main > * {
  min-width: 0;
  max-width: 100%;
}

:where(main, section, article, aside, div, form, fieldset) {
  min-width: 0;
}

:where(h1, h2, h3, h4, h5, h6, p, li, a, span) {
  overflow-wrap: anywhere;
}

table {
  width: 100%;
  display: block;
  overflow-x: auto;
  border-collapse: collapse;
}

pre {
  max-width: 100%;
  overflow-x: auto;
}

input,
select,
textarea,
button {
  max-width: 100%;
}

a {
  color: inherit;
  text-decoration: none;
}

a:focus-visible,
button:focus-visible {
  outline: 3px solid var(--accent);
  outline-offset: 2px;
  border-radius: 8px;
}

h1,
h2,
h3,
h4,
h5,
h6 {
  font-family: var(--font-display, ui-monospace, SFMono-Regular, Menlo, Consolas, monospace);
  letter-spacing: 0.02em;
}

@media (prefers-reduced-motion: reduce) {
  * { animation: none !important; transition: none !important; }
}

main {
  width: min(var(--content-max), 100% - clamp(24px, 6vw, 64px));
  margin-inline: auto;
  margin-block-start: clamp(var(--space-3), 2vw, var(--space-4));
  margin-block-end: clamp(var(--space-5), 4vw, var(--space-6));
}

.container {
  width: min(var(--content-max), 100% - clamp(24px, 6vw, 64px));
  margin-inline: auto;
}

.metallicBg { background: var(--metal-gradient); color: #fff; }
.rounded { border-radius: 1rem; }

.shinyText {
  background: var(--metal-gradient);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  color: transparent;
}

button {
  padding: 0.55rem 0.95rem;
  font-family: var(--font-body, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif);
  font-size: clamp(0.8rem, 0.4rem + 0.3vw, 0.95rem);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08rem;
  border: 2px solid var(--border);
  border-radius: var(--radius-sm);
  cursor: pointer;
  background: linear-gradient(180deg, #ffffff 0%, var(--paper-2) 100%);
  color: var(--ink);
  box-shadow:
    inset 0 2px 0 rgba(255, 255, 255, 0.85),
    inset 0 -2px 0 rgba(18, 11, 31, 0.18),
    4px 4px 0 rgba(18, 11, 31, 0.22);
  transition: transform var(--transition-fast), box-shadow 200ms;
  -webkit-tap-highlight-color: transparent;
}

button:hover {
  transform: translateY(-1px);
  box-shadow:
    inset 0 2px 0 rgba(255, 255, 255, 0.88),
    inset 0 -2px 0 rgba(18, 11, 31, 0.18),
    6px 6px 0 rgba(18, 11, 31, 0.26);
}

button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

@media (max-width: 1024px) {
  :root {
    --header-offset: calc(var(--header-height) - clamp(0.85rem, 2.75vw, 1.9rem));
  }

  main {
    margin-block-start: clamp(var(--space-3), 2.5vw, var(--space-4));
    margin-block-end: clamp(var(--space-4), 3vw, var(--space-5));
  }

  button {
    letter-spacing: 0.04em;
  }
}

@media (max-width: 768px) {
  :root {
    --header-offset: calc(var(--header-height) - clamp(0.95rem, 3.25vw, 2.1rem));
  }

  main {
    width: min(var(--content-max), 100% - clamp(16px, 5vw, 40px));
    margin-block-start: clamp(var(--space-2), 2.5vw, var(--space-3));
    margin-block-end: clamp(var(--space-4), 3vw, var(--space-5));
  }

  button {
    box-shadow: 3px 3px 0 rgba(18, 11, 31, 0.2);
  }
}

@media (max-width: 480px) {
  :root {
    --radius: 12px;
    --radius-sm: 9px;
    --header-offset: calc(var(--header-height) - clamp(1.05rem, 3.75vw, 2.3rem));
  }

  body {
    font-size: clamp(14px, 3.5vw, 16px);
  }

  main {
    width: min(var(--content-max), 100% - clamp(12px, 4.5vw, 28px));
  }

  button {
    padding: 0.7rem 1rem;
    text-transform: none;
    letter-spacing: 0.02em;
  }
}

hr {
  border: 0;
  height: 2px;
  background: rgba(18, 11, 31, 0.15);
  margin: var(--space-5) 0;
}

input,
select,
textarea {
  font-family: var(--font-body, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif);
  font-size: 1rem;
  color: var(--ink);
  background: rgba(255, 255, 255, 0.92);
  border: 2px solid rgba(18, 11, 31, 0.55);
  border-radius: var(--radius-sm);
  padding: 0.55rem 0.7rem;
  box-shadow: inset 2px 2px 0 rgba(18, 11, 31, 0.08);
}

input:focus-visible,
select:focus-visible,
textarea:focus-visible {
  outline: 3px solid rgba(255, 230, 0, 0.85);
  outline-offset: 2px;
}

html.header-scrolled [data-component='breaking-bar'] {
  display: none !important;
}
`;

export function GlobalStyles(): ReactElement {
  return <style data-inline="global" dangerouslySetInnerHTML={{ __html: globalCss }} />;
}

export default GlobalStyles;
