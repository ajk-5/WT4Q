import type { ReactElement } from 'react';

const globalCss = String.raw`
/* Global baseline styles inlined to avoid a render-blocking stylesheet */

/* =========
   Fonts
   ========= */
/* Self-host CloisterBlack (WOFF2 + TTF fallback in /public/fonts) */
@font-face {
  font-family: 'CloisterBlack';
  /* Prefer WOFF2 with TTF fallback */
  src: url('/fonts/CloisterBlack.woff2') format('woff2'),
       url('/fonts/CloisterBlack.ttf') format('truetype');
  font-weight: 400;
  font-style: normal;
  font-display: swap;
}

/* =========
   Design Tokens
   ========= */
:root {
  /* Colors */
  --background: #3c6c9c;
  --foreground: #1a1a1a;
  --primary: #2b0a86;
  --secondary: #1e1e6f;
  --accent: #e63946;
  --ink: #000;
  --muted: #6c757d;
  --font-inter: 'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, sans-serif;

  /* Theme (kept) */
  --wt4q-yellow: #ffd166;
  --wt4q-red: #ef476f;
  --wt4q-blue: #118ab2;
  --wt4q-green: #06d6a0;
  --metal-base: #ffffff;
  --metal-reflect: #f8f9fa;
  --metal-shadow: rgba(0,0,0,0.1);
  --text-default: #1a1a1a;
  --text-light: #6c757d;
  --error-red: #e63946;
  --metal-gradient: linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%);

  /* Tetris game colors */
  --bg1: #2b0a86;
  --bg2: #130242;
  --panel: rgba(255,255,255,0.08);
  --panel-border: rgba(255,255,255,0.18);

  /* Layout scale */
  --content-max: 1200px;
  --radius: 14px;
  --space-1: 0.25rem;
  --space-2: 0.5rem;
  --space-3: 0.75rem;
  --space-4: 1rem;
  --space-5: 1.5rem;
  --space-6: 2rem;

  /* Fluid typography */
  --font-size-base: clamp(14px, 0.9rem + 0.25vw, 18px);
  --font-size-sm: clamp(12px, 0.8rem + 0.1vw, 16px);
  --font-size-lg: clamp(16px, 1rem + 0.5vw, 22px);
  --line-height: 1.6;

  /* Motion */
  --transition-fast: 120ms;
  --shadow-elev: 0 6px 15px rgba(0,0,0,0.4);
  --shadow-elev-lg: 0 12px 25px rgba(0,0,0,0.45);
  /* Reserve space for the fixed header without JS measurements */
  --header-height: calc(clamp(1.6rem, 6vw, 3.6rem) * 1.1 + 6.75rem);
  --header-offset: calc(var(--header-height) - clamp(0.65rem, 2vw, 1.6rem));
}

/* Dark scheme tweaks (kept) */
@media (prefers-color-scheme: dark) {
  :root {
    --background: #0a0a0a;
    --foreground: #584949;
  }
}

/* =========
   Base / Reset
   ========= */
* { box-sizing: border-box; margin: 0; padding: 0; }

html, body { height: 100%; }

html {
  color-scheme: light dark;
  -webkit-text-size-adjust: 100%;
  text-size-adjust: 100%;
}

/* =========
   Background fix -- always covers screen
   ========= */
body {
  color: var(--foreground);
  background-color: var(--background); /* fallback color */
  font-family: "Georgia", "Times New Roman", serif;
  font-size: var(--font-size-base);
  line-height: var(--line-height);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  max-width: 150vw;
  overflow-x: hidden;
  position: relative;
  min-height: 100svh;
  min-height: -webkit-fill-available;
  /* Reserve space below fixed header so content isn't hidden */
  padding-top: var(--header-offset);
}

body::before {
  content: "";
  position: fixed;
  inset: 0;
  z-index: -1;
  /* Decorative paper texture is lazy-applied via CSS var to avoid blocking paint */
  background-color: #EEE9DA;
  background-image: var(
    --paper-bg,
    radial-gradient(1px 1px at 30% 40%, rgba(0,0,0,.03), transparent 2px),
    radial-gradient(1px 1px at 70% 60%, rgba(0,0,0,.02), transparent 2px)
  );
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  will-change: transform;
}

/* For the purple site background variant */
body.site-bg--purple::before {
  background-color: #EEE9DA;
  background-image:
    radial-gradient(900px circle at 60% 15%, rgba(255,255,255,0.12), transparent 45%),
    radial-gradient(1400px circle at 80% 0, #3a17a7 0, #2b0a86 55%, #1f085f 85%, #14043d 100%),
    var(
      --paper-bg,
      radial-gradient(1px 1px at 30% 40%, rgba(0,0,0,.03), transparent 2px),
      radial-gradient(1px 1px at 70% 60%, rgba(0,0,0,.02), transparent 2px)
    );
}

/* Respect data-saver preferences: never load the decorative background */
@media (prefers-reduced-data: reduce) {
  body::before,
  body.site-bg--purple::before {
    background: none !important;
  }
}

canvas,
img,
svg,
video {
  max-width: 100%;
  height: auto;
  display: block;
}

a {
  color: inherit;
  text-decoration: none;
}

a:focus-visible,
button:focus-visible {
  outline: 3px solid var(--wt4q-yellow);
  outline-offset: 2px;
  border-radius: 8px;
}

/* Headings */
h1,
h2,
h3,
h4,
h5,
h6 {
  font-variant: small-caps;
}

/* Reduce motion preference */
@media (prefers-reduced-motion: reduce) {
  * { animation: none !important; transition: none !important; }
}

/* =========
   Layout
   ========= */
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

/* =========
   Theming helpers
   ========= */
.metallicBg { background: var(--metal-gradient); color: var(--metal-reflect); }
.rounded { border-radius: 1rem; }

.shinyText {
  background: var(--metal-gradient);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  color: transparent;
}

/* =========
   Buttons
   ========= */
button {
  padding: clamp(0.65rem, 0.6rem + 0.5vw, 0.9rem) clamp(0.9rem, 0.8rem + 0.8vw, 1rem);
  font-family: var(--font-inter), system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;
  font-size: clamp(0.8rem, 0.4rem + 0.3vw, 0.9rem);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06rem;
  border: none;
  border-radius: var(--radius);
  cursor: pointer;
  background: linear-gradient(145deg, var(--primary), var(--secondary));
  color: #fff;
  box-shadow:
    inset 3px 3px 6px var(--metal-shadow),
    inset -3px -3px 6px var(--metal-reflect),
    var(--shadow-elev);
  transition: transform var(--transition-fast), box-shadow 200ms;
  -webkit-tap-highlight-color: transparent;
}

button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* =========
   RESPONSIVE
   ========= */
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
    box-shadow:
      inset 2px 2px 4px var(--metal-shadow),
      inset -2px -2px 4px var(--metal-reflect),
      0 4px 10px rgba(0,0,0,0.35);
  }
}

@media (max-width: 480px) {
  :root {
    --radius: 12px;
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

/* =========
   Nice-to-haves
   ========= */
.metallicBg.rounded {
  border-radius: 1rem;
}

hr {
  border: 0;
  height: 1px;
  background: rgba(0,0,0,0.08);
  margin: var(--space-5) 0;
}

/* Hide the breaking bar when header is compacted */
html.header-scrolled [data-component='breaking-bar'] {
  display: none !important;
}
`;

export function GlobalStyles(): ReactElement {
  return <style data-inline="global" dangerouslySetInnerHTML={{ __html: globalCss }} />;
}

export default GlobalStyles;
