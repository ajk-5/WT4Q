"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type WakeLockSentinelLike = { release?: () => Promise<void> } | null;
import styles from "./ArticleTTS.module.css";

type VoiceInfo = SpeechSynthesisVoice & { id?: string };

function splitIntoChunks(text: string, maxLen = 200): string[] {
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) return [];
  const parts: string[] = [];
  let i = 0;
  while (i < clean.length) {
    let end = Math.min(i + maxLen, clean.length);
    if (end < clean.length) {
      // try to cut on sentence/question/exclamation or a space
      const puncts = [".", "?", "!", ";", ":"];
      const punctPositions = puncts.map((p) => clean.lastIndexOf(p, end));
      const punct = Math.max(...punctPositions);
      const space = clean.lastIndexOf(" ", end);
      const cut = Math.max(punct, space);
      if (cut > i + 40) end = cut + 1; // avoid tiny chunks
    }
    parts.push(clean.slice(i, end).trim());
    i = end;
  }
  return parts.filter(Boolean);
}

export default function ArticleTTS({
  text,
  title,
  storageKey,
}: {
  text: string;
  title?: string;
  /** A stable key (e.g., article id or slug) to persist position */
  storageKey?: string;
}) {
  const isIos = typeof navigator !== 'undefined' && /iP(hone|ad|od)/.test(navigator.userAgent);
  const [voices, setVoices] = useState<VoiceInfo[]>([]);
  const [voiceId, setVoiceId] = useState<string>("");
  const [rate, setRate] = useState<number>(1);
  const [speaking, setSpeaking] = useState(false);
  const [paused, setPaused] = useState(false);
  const [pitch, setPitch] = useState<number>(1);
  // selection reading removed for simplicity
  const [mounted, setMounted] = useState(false);
  const [showPanel, setShowPanel] = useState(false);
  const [progressIndex, setProgressIndex] = useState(0);
  const [chunkProgress, setChunkProgress] = useState(0); // 0..1 within current chunk
  const [marqueeDuration, setMarqueeDuration] = useState(12); // seconds
  const [marqueeKey, setMarqueeKey] = useState(0); // force restart on new chunk
  const idxRef = useRef(0);
  const cancelRef = useRef(false);

  const chunkLen = isIos ? 160 : 220;
  const chunks = useMemo(() => splitIntoChunks(text, chunkLen), [text, chunkLen]);

  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const synth = window.speechSynthesis;

    const load = () => {
      const v = synth.getVoices();
      // Deduplicate voices by stable identifier (voiceURI), fallback to name+lang
      const seen = new Set<string>();
      const unique: SpeechSynthesisVoice[] = [];
      for (const vv of v) {
        const key = vv.voiceURI || `${vv.name}|${vv.lang}`;
        if (seen.has(key)) continue;
        seen.add(key);
        unique.push(vv);
      }
      setVoices(unique);
      const savedId = typeof localStorage !== 'undefined' ? localStorage.getItem('tts.voiceId') : null;
      const savedName = typeof localStorage !== 'undefined' ? localStorage.getItem('tts.voice') : null;
      let prefer: SpeechSynthesisVoice | undefined;
      if (savedId) prefer = unique.find((vv) => vv.voiceURI === savedId);
      if (!prefer && savedName) prefer = unique.find((vv) => vv.name === savedName);
      if (!prefer) prefer = unique.find((vv) => vv.lang?.toLowerCase().startsWith((navigator.language || 'en').toLowerCase().slice(0, 2)));
      if (!prefer) prefer = unique[0];
      if (prefer) setVoiceId(prefer.voiceURI || '');
    };

    load();
    synth.onvoiceschanged = load;
    return () => {
      synth.onvoiceschanged = null;
    };
  }, []);

  // Hydration-safe mount flag to avoid SSR/CSR markup mismatch
  useEffect(() => { setMounted(true); }, []);

  const stopAll = useCallback(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    cancelRef.current = true;
    window.speechSynthesis.cancel();
    setSpeaking(false);
    setPaused(false);
    idxRef.current = 0;
  }, []);

  // reset when text changes
  useEffect(() => {
    stopAll();
  }, [text, stopAll]);

  const speakNextRef = useRef<() => void>(() => {});

  // Rebuild the speakNext function whenever relevant inputs change
  useEffect(() => {
    speakNextRef.current = () => {
      if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
      const synth = window.speechSynthesis;
      if (cancelRef.current) return;
      if (idxRef.current >= chunks.length) {
        setSpeaking(false);
        setPaused(false);
        idxRef.current = 0;
        return;
      }
      const textToSpeak = chunks[idxRef.current];
      const u = new SpeechSynthesisUtterance(textToSpeak);
      const v = voices.find((vv) => vv.voiceURI === voiceId) || voices.find((vv) => vv.name === voiceId);
      if (v) u.voice = v;
      u.rate = rate;
      u.pitch = pitch;
      // Estimate duration for marquee sync (basic estimate)
      const estSec = Math.max(6, (textToSpeak.length / (rate * 11)));
      setMarqueeDuration(estSec);
      setMarqueeKey(Date.now());
      setChunkProgress(0);
      u.onboundary = (e: SpeechSynthesisEvent) => {
        if (typeof e.charIndex === 'number' && textToSpeak.length > 0) {
          const p = Math.min(1, Math.max(0, e.charIndex / textToSpeak.length));
          setChunkProgress(p);
        }
      };
      u.onend = () => {
        if (cancelRef.current) return;
        idxRef.current += 1;
        setProgressIndex(idxRef.current);
        setChunkProgress(0);
        if (storageKey) {
          try { localStorage.setItem(`tts.idx:${storageKey}`, String(idxRef.current)); } catch {}
        }
        // proceed to next chunk; tiny delay helps some mobile engines (iOS)
        setTimeout(() => speakNextRef.current(), isIos ? 100 : 0);
      };
      u.onerror = () => {
        // skip problematic chunk
        idxRef.current += 1;
        setProgressIndex(idxRef.current);
        setChunkProgress(0);
        setTimeout(() => speakNextRef.current(), isIos ? 100 : 0);
      };
      synth.speak(u);
    };
  }, [chunks, rate, voiceId, voices, pitch, storageKey, isIos]);

  const onPlay = useCallback(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    cancelRef.current = false;
    setShowPanel(true);
    const s = window.speechSynthesis;

    // If engine thinks we're paused, try a resume first (more reliable on iOS)
    if (s.paused) {
      try { s.resume(); } catch {}
      setPaused(false);
      setSpeaking(true);
      // Fallback: if still not speaking shortly after resume, cancel and restart
      setTimeout(() => {
        try {
          const ss = window.speechSynthesis;
          if (!ss.speaking) {
            ss.cancel();
            speakNextRef.current();
          }
        } catch {}
      }, isIos ? 250 : 150);
      return;
    }

    // If already speaking (e.g., resumed elsewhere), just reflect state
    if (s.speaking) {
      setPaused(false);
      setSpeaking(true);
      return;
    }

    // Fresh start: clear any pending utterances then begin from saved index
    try { s.cancel(); } catch {}
    if (storageKey) {
      const saved = parseInt(localStorage.getItem(`tts.idx:${storageKey}`) || '0', 10);
      idxRef.current = isFinite(saved) && saved > 0 && saved < chunks.length ? saved : 0;
    } else {
      idxRef.current = 0;
    }
    setProgressIndex(idxRef.current);
    setSpeaking(true);
    setPaused(false);
    speakNextRef.current();
  }, [storageKey, chunks.length, isIos]);

  const onPause = useCallback(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    if (window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
      window.speechSynthesis.pause();
      setPaused(true);
    }
  }, []);

  // onResume removed: use Play/Resume toggle instead

  const onStop = useCallback(() => {
    stopAll();
    setShowPanel(false);
    setChunkProgress(0);
  }, [stopAll]);

  const onRestart = useCallback(() => {
    stopAll();
    cancelRef.current = false;
    idxRef.current = 0;
    setProgressIndex(0);
    setSpeaking(true);
    setPaused(false);
    speakNextRef.current();
  }, [stopAll]);

  const onPrev = useCallback(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    cancelRef.current = false;
    idxRef.current = Math.max(0, idxRef.current - 1);
    setProgressIndex(idxRef.current);
    if (speaking || paused) speakNextRef.current();
  }, [speaking, paused]);

  const onNext = useCallback(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    cancelRef.current = false;
    idxRef.current = Math.min(chunks.length - 1, idxRef.current + 1);
    setProgressIndex(idxRef.current);
    if (speaking || paused) speakNextRef.current();
  }, [speaking, paused, chunks.length]);

  // read selection removed

  // key bindings: space pause/resume, arrows prev/next
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) return;
      if (e.code === 'Space') {
        e.preventDefault();
        if (speaking && !paused) onPause(); else onPlay();
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        onNext();
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        onPrev();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onPause, onPlay, onPrev, onNext, speaking, paused]);

  // iOS Safari sometimes pauses TTS randomly; nudge resume if not user-paused
  useEffect(() => {
    if (!isIos) return;
    const id = window.setInterval(() => {
      try {
        const s = window.speechSynthesis;
        if (s && s.speaking && s.paused && !paused) s.resume();
      } catch {}
    }, 1500);
    return () => clearInterval(id);
  }, [isIos, paused]);

  // Recovery watchdog: if engine stops unexpectedly, continue
  useEffect(() => {
    if (!speaking || paused) return;
    const id = window.setInterval(() => {
      try {
        const s = window.speechSynthesis;
        if (!s) return;
        if (!s.speaking && !s.paused && idxRef.current < chunks.length) {
          speakNextRef.current();
        }
      } catch {}
    }, 2000);
    return () => clearInterval(id);
  }, [speaking, paused, chunks.length]);

  // Try to keep screen awake while speaking (where supported)
  useEffect(() => {
    let lock: WakeLockSentinelLike = null;
    const nav = navigator as Navigator & { wakeLock?: { request: (type: 'screen') => Promise<WakeLockSentinelLike> } };
    const request = async () => {
      try {
        if (nav.wakeLock && !lock) lock = await nav.wakeLock.request('screen');
      } catch { /* ignore */ }
    };
    const release = async () => {
      try { await lock?.release?.(); } catch {}
      lock = null;
    };
    if (speaking && !paused) {
      request();
      const onVis = () => { if (document.visibilityState === 'visible' && speaking && !paused) request(); };
      document.addEventListener('visibilitychange', onVis);
      return () => { document.removeEventListener('visibilitychange', onVis); release(); };
    }
    // when not speaking
    release();
    return () => { release(); };
  }, [speaking, paused]);

  // persist settings
  useEffect(() => {
    try { localStorage.setItem('tts.rate', String(rate)); } catch {}
  }, [rate]);
  useEffect(() => {
    try { localStorage.setItem('tts.pitch', String(pitch)); } catch {}
  }, [pitch]);
  useEffect(() => {
    if (!voiceId) return;
    try {
      localStorage.setItem('tts.voiceId', voiceId);
      const v = voices.find((vv) => vv.voiceURI === voiceId);
      if (v?.name) localStorage.setItem('tts.voice', v.name);
    } catch {}
  }, [voiceId, voices]);

  // restore settings on mount
  useEffect(() => {
    try {
      const r = parseFloat(localStorage.getItem('tts.rate') || '1');
      if (isFinite(r) && r > 0) setRate(r);
      const p = parseFloat(localStorage.getItem('tts.pitch') || '1');
      if (isFinite(p) && p > 0) setPitch(p);
    } catch {}
  }, []);

  const ttsAvailable = typeof window !== "undefined" && "speechSynthesis" in window;

  // During SSR and the first client render, render nothing to match server HTML
  if (!mounted) return null;
  if (!ttsAvailable || chunks.length === 0) return null;

  return (
    <div className={styles.container} role="region" aria-label={`Text to speech controls for ${title ?? "article"}`}>
      <div className={styles.toolbar}>
        {(() => {
          const isPlaying = speaking && !paused;
          const label = isPlaying
            ? 'Pause reading'
            : paused
            ? 'Resume reading'
            : 'Read article';
          const onClick = isPlaying ? onPause : onPlay;
          return (
            <button type="button" className={styles.button} onClick={onClick} aria-label={label}>
              {isPlaying ? (
                // Pause icon
                <svg className={styles.icon} viewBox="0 0 24 24" aria-hidden="true" xmlns="http://www.w3.org/2000/svg"><path fill="currentColor" d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
              ) : (
                // Play icon
                <svg className={styles.icon} viewBox="0 0 24 24" aria-hidden="true" xmlns="http://www.w3.org/2000/svg"><path fill="currentColor" d="M8 5v14l11-7z"/></svg>
              )}
            </button>
          );
        })()}
        <button type="button" className={styles.button} onClick={onRestart} aria-label="Restart from beginning">
          {/* Restart icon */}
          <svg className={styles.icon} viewBox="0 0 24 24" aria-hidden="true" xmlns="http://www.w3.org/2000/svg"><path fill="currentColor" d="M12 6V3L8 7l4 4V8c2.76 0 5 2.24 5 5a5 5 0 0 1-9.9 1h-2.1a7 7 0 1 0 7-8z"/></svg>
        </button>
        <button type="button" className={styles.button} onClick={onPrev} aria-label="Previous segment" disabled={!speaking && !paused}>
          {/* Prev icon */}
          <svg className={styles.icon} viewBox="0 0 24 24" aria-hidden="true" xmlns="http://www.w3.org/2000/svg"><path fill="currentColor" d="M11 18V6l-8.5 6L11 18zm2-12v12l8.5-6L13 6z"/></svg>
        </button>
        <button type="button" className={styles.button} onClick={onNext} aria-label="Next segment" disabled={!speaking && !paused}>
          {/* Next icon */}
          <svg className={styles.icon} viewBox="0 0 24 24" aria-hidden="true" xmlns="http://www.w3.org/2000/svg"><path fill="currentColor" d="M13 6v12l8.5-6L13 6zM3 6v12l8.5-6L3 6z"/></svg>
        </button>
        <button type="button" className={styles.button} onClick={onStop} disabled={!speaking && !paused} aria-label="Stop reading">
          {/* Stop icon */}
          <svg className={styles.icon} viewBox="0 0 24 24" aria-hidden="true" xmlns="http://www.w3.org/2000/svg"><path fill="currentColor" d="M6 6h12v12H6z"/></svg>
        </button>
      </div>

      <span className={styles.field}>
        <label className={styles.label} htmlFor="tts-voice">Voice</label>
        <select
          id="tts-voice"
          className={styles.select}
          value={voiceId}
          onChange={(e) => setVoiceId(e.target.value)}
          aria-label="Select voice"
        >
          {voices.map((v, i) => (
            <option key={`${v.voiceURI || v.name}-${i}`} value={v.voiceURI || v.name}>{`${v.name} (${v.lang})`}</option>
          ))}
        </select>
      </span>

      <span className={styles.field}>
        <label className={styles.label} htmlFor="tts-rate">Rate</label>
        <input
          id="tts-rate"
          className={styles.range}
          type="range"
          min={0.7}
          max={1.4}
          step={0.05}
          value={rate}
          onChange={(e) => setRate(parseFloat(e.target.value))}
          aria-label="Reading speed"
        />
      </span>

      <span className={styles.field}>
        <label className={styles.label} htmlFor="tts-pitch">Pitch</label>
        <input
          id="tts-pitch"
          className={styles.range}
          type="range"
          min={0.5}
          max={2}
          step={0.1}
          value={pitch}
          onChange={(e) => setPitch(parseFloat(e.target.value))}
          aria-label="Voice pitch"
        />
      </span>

      {showPanel && (
        <div className={styles.panel} aria-label="Reading panel">
          <div className={styles.progressWrap} aria-label="Reading progress">
            <div
              className={styles.progressBar}
              style={{ width: `${Math.min(100, ((progressIndex + chunkProgress) / Math.max(1, chunks.length)) * 100)}%` }}
            />
          </div>
          <div className={styles.marqueeBox} aria-hidden>
            <span
              key={marqueeKey}
              className={`${styles.small} ${styles.marqueeText}`}
              style={{
                animationDuration: `${marqueeDuration}s`,
                animationPlayState: paused || !speaking ? 'paused' as const : 'running' as const,
              }}
            >
              {chunks[Math.min(progressIndex, chunks.length - 1)] || ''}
            </span>
          </div>
        </div>
      )}

      <span className={styles.srOnly} aria-live="polite">
        {speaking ? (paused ? "Paused" : "Playing") : "Stopped"}
      </span>
    </div>
  );
}
