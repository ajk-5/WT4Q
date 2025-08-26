'use client';

import { useEffect } from 'react';
import styles from './TypingPractice.module.css';

interface Props {
  initialText: string;
}

export default function TypingPracticeClient({ initialText }: Props) {
  useEffect(() => {
    (function () {
      // === Word lists & quotes ===
      const WORDS_EASY =
        'the of and to a in is you that it he was for on are as with his they I at be this have from or one had by word but not what all were we when your can said there use an each which she do how their if will up other about out many then them these so some her would make like him into time has look two more write go see number no way could people my than first water been call who oil its now find long down day did get come made may part'.split(/\s+/);

      const WORDS_MEDIUM =
        'bridge motion elegant figure silver window forest travel storm gentle whisper bright velvet hidden puzzle lantern shadow crystal rhythm galaxy vessel anchor meadow distant silent fragile frequent fabric hollow vivid subtle ripple orbit spiral crater amber vivid moment narrow velvet luminous shimmer cascade swift granite magnet fossil falcon maple cedar salmon azure sprint dodge arrow quiver'.split(/\s+/);

      const WORDS_HARD =
        'quixotic zephyr labyrinthine juxtapose chrysanthemum vestibule silhouette nebulous quintessential panacea vicissitude synecdoche susurrus chiaroscuro phantasmagoria incandescence mellifluous grandiloquent indefatigable perspicacious sesquipedalian ebullient paucity verisimilitude apotheosis intransigent obfuscate recondite anachronistic obstreperous'.split(/\s+/);

      const QUOTES = [
        'The quick brown fox jumps over the lazy dog.',
        'Programs must be written for people to read, and only incidentally for machines to execute.',
        'Premature optimization is the root of all evil.',
        'Simplicity is the soul of efficiency.',
        'Talk is cheap. Show me the code.',
        'Any fool can write code that a computer can understand. Good programmers write code that humans can understand.',
        'First, solve the problem. Then, write the code.',
        'In theory, theory and practice are the same. In practice, they\u2019re not.',
      ];

      // === DOM refs ===
      const canvas = document.getElementById('typingCanvas') as HTMLCanvasElement;
      const mobileInput = document.getElementById('mobileInput') as HTMLInputElement;
      const modeSel = document.getElementById('mode') as HTMLSelectElement;
      const diffSel = document.getElementById('difficulty') as HTMLSelectElement;
      const wordCountInput = document.getElementById('wordCount') as HTMLInputElement;
      const wordsCountGroup = document.getElementById('wordsCountGroup') as HTMLDivElement;
      const customTextEl = document.getElementById('customText') as HTMLTextAreaElement;
      const btnStart = document.getElementById('btnStart') as HTMLButtonElement;
      const btnPause = document.getElementById('btnPause') as HTMLButtonElement;
      const btnReset = document.getElementById('btnReset') as HTMLButtonElement;
      const btnNext = document.getElementById('btnNext') as HTMLButtonElement;
      const btnTheme = document.getElementById('btnTheme') as HTMLButtonElement;
      const wpmEl = document.getElementById('wpm') as HTMLDivElement;
      const accEl = document.getElementById('accuracy') as HTMLDivElement;
      const timeEl = document.getElementById('time') as HTMLDivElement;

      const statusEl = document.getElementById('status') as HTMLDivElement;

      // === Canvas state ===
      const DPR = window.devicePixelRatio || 1;
      const PADDING = 32; // css pixels
      const FONT_SIZE = 22; // css px
      const LINE_HEIGHT = 34; // css px
      const FONT_FAMILY = 'ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace';
      let ctx: CanvasRenderingContext2D | null;

      // Typing state
      let target = '';
      let typed = '';
      let started = false;
      let paused = false;
      let completed = false;
      let correctCount = 0; // total correct keypresses
      let errorCount = 0; // total incorrect keypresses
      let totalKeypress = 0;
      let startTimeMs = 0;
      let pausedAccumMs = 0; // total paused duration
      let pauseStartMs = 0;

      // Layout cache
      let charLayout: { x: number; y: number; w: number; c: string }[] = [];
      let caretBlinkOn = true;
      let caretBlinkTimer = 0;
      let rafId = 0;
      let errorFlashUntil = 0; // timestamp (ms) until which we flash error highlight

      function initCanvas() {
        const cssWidth = canvas.clientWidth;
        const cssHeight = canvas.clientHeight;
        canvas.width = Math.max(1, Math.floor(cssWidth * DPR));
        canvas.height = Math.max(1, Math.floor(cssHeight * DPR));
        ctx = canvas.getContext('2d');
        ctx?.setTransform(DPR, 0, 0, DPR, 0, 0); // scale for crispness
        if (ctx) {
          ctx.textBaseline = 'top';
          ctx.font = `${FONT_SIZE}px ${FONT_FAMILY}`;
        }
        layoutText();
        render();
      }

      function getWordBank() {
        switch (diffSel.value) {
          case 'hard':
            return WORDS_HARD;
          case 'medium':
            return WORDS_MEDIUM;
          default:
            return WORDS_EASY;
        }
      }

      function generateText() {
        const custom = (customTextEl.value || '').trim();
        if (custom) {
          return custom.replace(/\s+/g, ' ').slice(0, 2000);
        }
        if (modeSel.value === 'quote') {
          return QUOTES[Math.floor(Math.random() * QUOTES.length)];
        }
        const n = Math.max(5, Math.min(200, parseInt(wordCountInput.value || '30', 10)));
        const bank = getWordBank();
        const words = [] as string[];
        for (let i = 0; i < n; i++) {
          words.push(bank[Math.floor(Math.random() * bank.length)]);
        }
        return words.join(' ');
      }

      function resetTest(newTarget?: string) {
        target = newTarget != null ? newTarget : generateText();
        typed = '';
        started = false;
        paused = false;
        completed = false;
        correctCount = 0;
        errorCount = 0;
        totalKeypress = 0;
        startTimeMs = 0;
        pausedAccumMs = 0;
        pauseStartMs = 0;
        caretBlinkOn = true;
        caretBlinkTimer = 0;
        layoutText();
        render();
        updateStats();
      }

      function layoutText() {
        if (!ctx) return;
        ctx.font = `${FONT_SIZE}px ${FONT_FAMILY}`;
        const maxWidth = canvas.clientWidth - PADDING * 2;
        let curX = PADDING;
        let curY = PADDING;
        charLayout = [];
        for (let i = 0; i < target.length; i++) {
          const ch = target[i];
          const w = Math.ceil(ctx.measureText(ch).width);
          if (ch === '\n' || (curX + w > PADDING + maxWidth && ch !== ' ')) {
            curX = PADDING;
            curY += LINE_HEIGHT;
          }
          charLayout.push({ x: curX, y: curY, w, c: ch });
          curX += w;
        }
      }

      function formatTime(ms: number) {
        const t = Math.max(0, Math.floor(ms / 1000));
        const m = Math.floor(t / 60).toString().padStart(2, '0');
        const s = (t % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
      }

      function elapsedMs() {
        if (!started) return 0;
        const active = paused ? pauseStartMs - startTimeMs : Date.now() - startTimeMs;
        return active + pausedAccumMs;
      }

      function wpmNow() {
        const mins = Math.max(1 / 600, elapsedMs() / 60000);
        return (correctCount / 5) / mins;
      }

      function accuracyNow() {
        if (totalKeypress === 0) return 100;
        return Math.max(0, Math.min(100, (correctCount / totalKeypress) * 100));
      }

      function updateStats() {
        wpmEl.textContent = Math.round(wpmNow()).toString();
        accEl.textContent = `${Math.round(accuracyNow())}%`;
        timeEl.textContent = formatTime(elapsedMs());

        const prog = Math.min(100, Math.round((typed.length / Math.max(1, target.length)) * 100));
        statusEl.textContent =
          `${prog}% \u2022 Errors: ${errorCount}` +
          (completed ? ' \u2022 Completed! \ud83c\udf89' : paused ? ' \u2022 Paused' : '');

      }

      function start() {
        if (completed) return;
        if (!started) {
          started = true;
          startTimeMs = Date.now();
        }
        if (paused) {
          paused = false;
          pausedAccumMs += Date.now() - pauseStartMs;
        }
        mobileInput.focus();
        canvas.focus();
        loop();
      }

      function pause() {
        if (!started || paused || completed) return;
        paused = true;
        pauseStartMs = Date.now();
        cancelAnimationFrame(rafId);
        render();
        updateStats();
      }

      function toggleTheme() {
        const dark =
          getComputedStyle(document.documentElement).getPropertyValue('--bg').trim() === '#0f172a';
        if (dark) {
          document.documentElement.style.setProperty('--bg', '#f3f4f6');
          document.documentElement.style.setProperty('--panel', '#ffffff');
          document.documentElement.style.setProperty('--text', '#111827');
          document.documentElement.style.setProperty('--muted', '#6b7280');
          document.documentElement.style.setProperty('--accent', '#2563eb');
          document.documentElement.style.setProperty('--ok', '#16a34a');
          document.documentElement.style.setProperty('--bad', '#dc2626');
          document.documentElement.style.setProperty('--warn', '#d97706');
        } else {
          document.documentElement.style.setProperty('--bg', '#0f172a');
          document.documentElement.style.setProperty('--panel', '#111827');
          document.documentElement.style.setProperty('--text', '#e5e7eb');
          document.documentElement.style.setProperty('--muted', '#9ca3af');
          document.documentElement.style.setProperty('--accent', '#60a5fa');
          document.documentElement.style.setProperty('--ok', '#22c55e');
          document.documentElement.style.setProperty('--bad', '#ef4444');
          document.documentElement.style.setProperty('--warn', '#f59e0b');
        }
        render();
      }

      function handleKey(e: KeyboardEvent) {
        if (!started || paused || completed) return;
        if (e.ctrlKey || e.metaKey) return;
        const key = e.key;
        if (key === 'Backspace') {
          if (typed.length > 0) {
            typed = typed.slice(0, -1);
          }
          e.preventDefault();
        } else if (key.length === 1) {
          const ch = key;
          const expected = target[typed.length] || '';
          totalKeypress++;
          if (ch === expected) {
            correctCount++;
            typed += ch;
          } else {
            errorCount++;
            errorFlashUntil = Date.now() + 200;
            if (navigator.vibrate) {
              try {
                navigator.vibrate(10);
              } catch {}
            }
          }
          e.preventDefault();
        } else if (key === 'Enter') {
          const expected = target[typed.length] || '';
          totalKeypress++;
          if (expected === '\n') {
            correctCount++;
            typed += '\n';
          } else {
            errorCount++;
            errorFlashUntil = Date.now() + 200;
            if (navigator.vibrate) {
              try {
                navigator.vibrate(10);
              } catch {}
            }
          }
          e.preventDefault();
        } else {
          return;
        }

        if (typed.length >= target.length) {
          completed = true;
          cancelAnimationFrame(rafId);
        }

        caretBlinkTimer = 0;
        caretBlinkOn = true;
        updateStats();
        render();
      }

      function loop() {
        rafId = requestAnimationFrame(loop);
        if (paused || completed || !started) return;
        caretBlinkTimer += 16;
        if (caretBlinkTimer > 600) {
          caretBlinkOn = !caretBlinkOn;
          caretBlinkTimer = 0;
        }
        updateStats();
        render();
      }

      function drawRoundedRect(x: number, y: number, w: number, h: number, r: number) {
        const rr = Math.min(r, h / 2, w / 2);
        ctx!.beginPath();
        ctx!.moveTo(x + rr, y);
        ctx!.arcTo(x + w, y, x + w, y + h, rr);
        ctx!.arcTo(x + w, y + h, x, y + h, rr);
        ctx!.arcTo(x, y + h, x, y, rr);
        ctx!.arcTo(x, y, x + w, y, rr);
        ctx!.closePath();
      }

      function render() {
        if (!ctx) return;
        ctx.save();
        ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
        ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);
        const w = canvas.clientWidth;
        const h = canvas.clientHeight;
        ctx.globalAlpha = 0.05;
        for (let y = PADDING; y < h - PADDING; y += LINE_HEIGHT) {
          ctx.beginPath();
          ctx.moveTo(PADDING, y + LINE_HEIGHT);
          ctx.lineTo(w - PADDING, y + LINE_HEIGHT);
          ctx.strokeStyle = '#fff';
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
        ctx.font = `600 16px ${FONT_FAMILY}`;
        ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--muted').trim() || '#9ca3af';
        ctx.fillText('Text', PADDING, 8);
        ctx.font = `${FONT_SIZE}px ${FONT_FAMILY}`;
        const ok = getComputedStyle(document.documentElement).getPropertyValue('--ok').trim() || '#22c55e';
        const bad = getComputedStyle(document.documentElement).getPropertyValue('--bad').trim() || '#ef4444';
        const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#60a5fa';
        const up = getComputedStyle(document.documentElement).getPropertyValue('--muted').trim() || '#9ca3af';
        const idx = Math.min(typed.length, charLayout.length - 1);
        const caretPos = charLayout[idx] || { x: PADDING, y: PADDING, w: 12 };
        if (!completed) {
          const now = Date.now();
          const isErrorFlash = now < errorFlashUntil;
          ctx.globalAlpha = isErrorFlash ? 0.35 : 0.2;
          drawRoundedRect(caretPos.x - 1, caretPos.y - 2, Math.max(12, caretPos.w + 2), LINE_HEIGHT, 6);
          ctx.fillStyle = isErrorFlash ? bad : accent;
          ctx.fill();
          ctx.globalAlpha = 1;
        }
        for (let i = 0; i < charLayout.length; i++) {
          const { x, y, c } = charLayout[i];
          const typedCh = typed[i];
          if (i < typed.length) {
            ctx.fillStyle = typedCh === c ? ok : bad;
          } else {
            ctx.fillStyle = up;
          }
          ctx.fillText(c, x, y);
        }
        if (!completed && caretBlinkOn) {
          ctx.beginPath();
          ctx.moveTo(caretPos.x - 2, caretPos.y);
          ctx.lineTo(caretPos.x - 2, caretPos.y + LINE_HEIGHT - 4);
          ctx.lineWidth = 2;
          ctx.strokeStyle = accent;
          ctx.stroke();
        }

        ctx.restore();
      }

      btnStart.addEventListener('click', start);
      btnPause.addEventListener('click', () => (paused ? start() : pause()));
      btnReset.addEventListener('click', () => resetTest());
      btnNext.addEventListener('click', () => resetTest(generateText()));
      btnTheme.addEventListener('click', toggleTheme);

      function updateModeUI() {
        const showWords = modeSel.value === 'words' && !customTextEl.value.trim();
        wordsCountGroup.style.display = showWords ? 'block' : 'none';
        diffSel.disabled = modeSel.value !== 'words';
      }
      modeSel.addEventListener('change', () => {
        updateModeUI();
        resetTest();
      });
      diffSel.addEventListener('change', () => resetTest());
      wordCountInput.addEventListener('change', () => resetTest());
      customTextEl.addEventListener('input', () => {
        updateModeUI();
        resetTest();
      });

      window.addEventListener('keydown', handleKey);
      window.addEventListener('resize', () => {
        initCanvas();
        render();
      });
      canvas.addEventListener('pointerdown', () => {
        start();
      });

      updateModeUI();
      initCanvas();
      resetTest(initialText && initialText.trim().slice(0, 2000));

      window.addEventListener('keydown', (e) => {
        if (e.code !== 'Space' || e.repeat) return;
        if (e.defaultPrevented) return;
        if (!(document.activeElement === canvas || document.activeElement === document.body)) return;
        if (!started || paused) {
          start();
          e.preventDefault();
        }
      });
    })();
  }, [initialText]);

  return (
    <main className={styles.main}>
      <h1 className={styles.pageTitle}>Typing Practice</h1>
      <p className={styles.description}>
        Practice typing online using the latest Technology article.
      </p>
      <div className={styles.container}>
        <div className={`${styles.panel} ${styles.controls}`}>
          <h2> Typing Practice </h2>

          <div className={styles.group}>
            <label htmlFor="mode">Mode</label>
            <div className={styles.row}>
              <select id="mode" defaultValue="words">
                <option value="words">Words</option>
                <option value="quote">Quote</option>
              </select>
              <select id="difficulty" title="Word list difficulty" defaultValue="easy">
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>
          </div>
          <div className={styles.group} id="wordsCountGroup">
            <label htmlFor="wordCount">Number of words</label>
            <input type="number" id="wordCount" min="5" max="200" defaultValue="30" />
          </div>
          <div className={styles.group}>
            <label htmlFor="customText">Custom text (optional)</label>
            <textarea
              id="customText"
              placeholder="Paste or type your own text here. If filled, it overrides Mode/Words."
            ></textarea>
          </div>
          <div className={`${styles.group} ${styles.row}`}>
            <button id="btnStart" className={`${styles.button} ${styles.buttonPrimary}`}>
              Start
            </button>
            <button id="btnPause" className={styles.button}>
              Pause
            </button>
            <button id="btnReset" className={`${styles.button} ${styles.buttonDanger}`}>
              Reset
            </button>
          </div>
          <div className={`${styles.group} ${styles.row}`}>
            <button id="btnNext" className={styles.button}>
              Next Text
            </button>
            <button id="btnTheme" className={styles.button}>
              Toggle Theme
            </button>
          </div>
          <div className={styles.stats}>
            <div className={styles.stat}>
              <div className={styles.value} id="wpm">
                0
              </div>
              <div className={styles.label}>WPM</div>
            </div>
            <div className={styles.stat}>
              <div className={styles.value} id="accuracy">
                100%
              </div>
              <div className={styles.label}>Accuracy</div>
            </div>
            <div className={styles.stat}>
              <div className={styles.value} id="time">
                00:00
              </div>
              <div className={styles.label}>Time</div>
            </div>
          </div>

        </div>
        <div className={`${styles.panel} ${styles.canvasWrap}`}>
          <canvas
            id="typingCanvas"
            className={styles.canvas}
            aria-label="Typing practice canvas"
            tabIndex={0}
          ></canvas>
          <input
            id="mobileInput"
            type="text"
            inputMode="text"
            autoCapitalize="off"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            style={{
              position: 'absolute',
              opacity: 0,
              pointerEvents: 'none',
              width: 0,
              height: 0,
              left: -9999,
              top: -9999,
            }}
          />

          <div id="status" className={styles.status}>
            0% • Errors: 0
          </div>
          <div className={styles.footer}>
            Tip: Click the canvas (or press <span className={styles.kbd}>Start</span>) and just type. Use{' '}
            <span className={styles.kbd}>Backspace</span> to correct.
          </div>

        </div>
      </div>
    </main>
  );
}
