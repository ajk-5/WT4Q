'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import styles from './QuizRunner.module.css';
import type { Quiz } from '@/lib/quizzes.types';
import ShareButtons from '@/components/ShareButtons';
import RetroBackLink from '@/components/RetroBackLink';
import { publicMediaUrl } from '@/lib/media';

export default function QuizRunner({ quiz }: { quiz: Quiz }) {
  // Determine question order (optionally randomized)
  const order = useMemo(() => {
    const base = quiz.questions.map((_, i) => i);
    if (quiz.randomize) {
      for (let i = base.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [base[i], base[j]] = [base[j], base[i]];
      }
    }
    return base;
  }, [quiz.questions, quiz.randomize]);

  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [locked, setLocked] = useState<Record<string, boolean>>({});
  const [completed, setCompleted] = useState(false);
  const [shareImgUrl, setShareImgUrl] = useState<string | null>(null);
  const [shareLink, setShareLink] = useState<string | null>(null);
  const [choiceOrder, setChoiceOrder] = useState<Record<string, number[]>>({});

  const total = quiz.questions.length || 0;
  const q = quiz.questions[order[index]];
  const questionImage = publicMediaUrl(q?.imageUrl);
  const showImageUrl = publicMediaUrl(quiz.show?.imageUrl || quiz.imageUrl);

  const answeredCount = Object.keys(answers).length;
  const progress = total > 0 ? Math.round((answeredCount / total) * 100) : 0;

  const totalPoints = useMemo(() => quiz.questions.reduce((sum, it) => sum + (it.points ?? 1), 0), [quiz.questions]);
  const { earnedPoints, correctCount } = useMemo(() => {
    let points = 0;
    let correct = 0;
    for (const item of quiz.questions) {
      const a = (answers[item.id] || '').trim();
      if (!a) continue;
      const isCorrect = item.answer.trim().toLowerCase() === a.toLowerCase();
      if (isCorrect) {
        correct += 1;
        points += (item.points ?? 1);
      }
    }
    return { earnedPoints: points, correctCount: correct };
  }, [answers, quiz.questions]);
  const percent = total > 0 ? Math.round((correctCount / total) * 100) : 0;

  // optional global time limit
  const [timeLeft, setTimeLeft] = useState<number | null>(quiz.timeLimitSec ?? null);
  const timerRef = useRef<number | null>(null);
  useEffect(() => {
    if (!timeLeft && timeLeft !== 0) return; // no timer
    if (completed) return;
    if ((timeLeft as number) <= 0) {
      setCompleted(true);
      return;
    }
    timerRef.current = window.setTimeout(() => setTimeLeft((t) => (t ?? 1) - 1), 1000);
    return () => { if (timerRef.current) window.clearTimeout(timerRef.current); };
  }, [timeLeft, completed]);

  // persist answers/locks locally for resume
  useEffect(() => { try { localStorage.setItem(`quiz-${quiz.slug}`, JSON.stringify({ answers, locked })); } catch {} }, [answers, locked, quiz.slug]);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(`quiz-${quiz.slug}`);
      if (raw) {
        const data = JSON.parse(raw) as { answers?: Record<string, string>; locked?: Record<string, boolean> };
        if (data?.answers) setAnswers(data.answers);
        if (data?.locked) setLocked(data.locked);
      }
    } catch {}
  }, [quiz.slug]);

  // initialize stable per-question shuffled choice order (persisted)
  useEffect(() => {
    try {
      const key = `quiz-${quiz.slug}-choiceOrder`;
      const existing = localStorage.getItem(key);
      if (existing) {
        const parsed = JSON.parse(existing) as Record<string, number[]>;
        setChoiceOrder(parsed);
        return;
      }
      const next: Record<string, number[]> = {};
      for (const item of quiz.questions) {
        const n = item.choices?.length ?? 0;
        if (n <= 1) continue;
        const arr = Array.from({ length: n }, (_, i) => i);
        // Shuffle sometimes (2/3 of the time) to match request
        if (Math.random() < 2 / 3) {
          for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
          }
        }
        next[item.id] = arr;
      }
      setChoiceOrder(next);
      localStorage.setItem(key, JSON.stringify(next));
    } catch {}
  }, [quiz.questions, quiz.slug]);

  const next = () => {
    if (index < total - 1) setIndex(index + 1);
    else setCompleted(true);
  };

  const prev = () => { setIndex((i) => Math.max(0, i - 1)); };

  const choose = (val: string) => {
    const id = q.id;
    if (locked[id]) return; // already submitted
    setAnswers((prev) => ({ ...prev, [id]: val }));
    if (q.choices && q.choices.length > 0) {
      setLocked((prev) => ({ ...prev, [id]: true }));
    }
  };

  const { rankLabel, rankDetail } = useMemo(() => {
    const tiers: Array<{
      min: number;
      labels: string[];
      descriptions: string[];
    }> = [
      {
        min: 90,
        labels: [
          '90s Genius',
          'Totally Radical!',
          'Pop Culture Wizard',
          'Ultra 90s Oracle',
          'Perfect Time Traveler',
        ],
        descriptions: [
          'You crushed this quiz with near-perfect 90s recall.',
          'You’re the friend everyone wants on their 90s trivia team.',
          'Your nostalgia radar is locked in and laser precise.',
        ],
      },
      {
        min: 70,
        labels: [
          'Retro Pro',
          'Mega Fan',
          'Hella Good',
          'Rewind Hero',
          'Blockbuster Brain',
        ],
        descriptions: [
          'You clearly lived through the 90s and paid attention.',
          'A few questions shy of perfection, but undeniably impressive.',
          'You know your way around VHS tapes, theme songs, and catchphrases.',
        ],
      },
      {
        min: 50,
        labels: [
          'Casual Nostalgic',
          'Solid Effort',
          'Getting Warmer',
          'Nostalgia Explorer',
          'On the Right Track',
        ],
        descriptions: [
          'You remember a lot—but there’s still more to rediscover.',
          'A respectable score that proves you’ve got 90s roots.',
          'Keep rewatching reruns and you’ll be a pro in no time.',
        ],
      },
      {
        min: 30,
        labels: [
          'Amateur',
          'New to the 90s',
          'Keep Practicing',
          'Rookie Rewinder',
          'Learning the Lingo',
        ],
        descriptions: [
          'You caught some references, but there’s a bigger world of 90s lore waiting.',
          'Not bad for a warm-up round—your 90s era training has begun.',
          'Give it another spin and watch your score climb.',
        ],
      },
      {
        min: 0,
        labels: [
          'Just Starting',
          'Freshman Fan',
          'Try Again!',
          'May be new',
          'Just Warming Up',
        ],
        descriptions: [
          'Every 90s legend starts somewhere—this is your tutorial level.',
          'You might be more 2000s than 90s, but that can change.',
          'Hit replay, learn a few deep cuts, and come back stronger.',
        ],
      },
    ];
    const extraLabels: Record<number, string[]> = {
      90: [
        'Nostalgia Grandmaster',
        'Time-Warp Wizard',
        'Arcade Legend',
        'Prime Time Prodigy',
        'Channel-Surfing Champion',
      ],
      70: [
        'Mixtape Master',
        'Saturday-Morning Specialist',
        'Retro Wizard in Training',
      ],
      50: [
        'Rerun Regular',
        'After-School Viewer',
      ],
      30: [
        'Channel Surfer in Training',
      ],
      0: [
        'Time-Travel Beginner',
        'New Challenger',
      ],
    };
    const extraDescriptions: Record<number, string[]> = {
      90: [
        'You crushed this quiz with near-perfect 90s recall.',
        'You are the friend everyone wants on their 90s trivia team.',
        'Your nostalgia radar is locked in and laser precise.',
        'Flawless victory. Your 90s memory is basically a superpower.',
        'You could host your own retro game show and never miss a question.',
      ],
      70: [
        'You clearly lived through the 90s and paid attention.',
        'A few questions shy of perfection, but undeniably impressive.',
        'You know your way around VHS tapes, theme songs, and catchphrases.',
        'You are only a handful of deep-cut questions away from true wizard status.',
        'Your 90s brain is dialed in and just getting started.',
      ],
      50: [
        'You remember a lot, but there is still more to rediscover.',
        'A respectable score that proves you have 90s roots.',
        'Keep rewatching reruns and you will be a pro in no time.',
        'You have the foundations down, now it is time for the deep cuts.',
      ],
      30: [
        'You caught some references, but there is a bigger world of 90s lore waiting.',
        'Not bad for a warm-up round. Your 90s era training has begun.',
        'Give it another spin and watch your score climb.',
        'Stick with it; every rerun, theme song, and jingle will push you higher.',
      ],
      0: [
        'Every 90s legend starts somewhere. This is your tutorial level.',
        'You might be more 2000s than 90s, but that can change.',
        'Hit replay, learn a few deep cuts, and come back stronger.',
        'Replay the era, soak in the vibes, and your next run will be way higher.',
      ],
    };
    const tier = tiers.find((t) => percent >= t.min) ?? tiers[tiers.length - 1];
    const labels = [...tier.labels, ...(extraLabels[tier.min] ?? [])];
    const descriptions = extraDescriptions[tier.min] ?? tier.descriptions;
    const label = labels[Math.floor(Math.random() * labels.length)];
    const description = descriptions[Math.floor(Math.random() * descriptions.length)];
    return { rankLabel: label, rankDetail: description };
  }, [percent]);

  const shareTitle = `I scored ${earnedPoints}/${totalPoints} on "${quiz.title}" - ${rankLabel} at The Nineties Times!`;

  // Save final result and generate poster
  useEffect(() => {
    if (!completed) return;
    try {
      const key = `quiz-${quiz.slug}-result`;
      const next = {
        correct: correctCount,
        total,
        points: earnedPoints,
        totalPoints,
        percent,
        rankLabel,
        createdAt: new Date().toISOString(),
      };
      let shouldSave = true;
      try {
        const existingRaw = localStorage.getItem(key);
        if (existingRaw) {
          const existing = JSON.parse(existingRaw) as { percent?: number; correct?: number; total?: number };
          const prev = typeof existing.percent === 'number'
            ? existing.percent
            : typeof existing.correct === 'number' && typeof existing.total === 'number' && existing.total > 0
              ? (existing.correct / existing.total) * 100
              : -1;
          const current = typeof next.percent === 'number'
            ? next.percent
            : next.total > 0
              ? (next.correct / next.total) * 100
              : -1;
          if (current <= prev) {
            shouldSave = false;
          }
        }
      } catch {
        // ignore malformed previous data
      }
      if (shouldSave) {
        try {
          localStorage.setItem(key, JSON.stringify(next));
        } catch {}
      }
    } catch {}
    const id = window.setTimeout(() => generatePoster(), 0);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [completed]);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  function generatePoster() {
    try {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const W = 1080;
      const H = 1080;
      canvas.width = W;
      canvas.height = H;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // background: deep navy gradient with subtle grid
      const grad = ctx.createLinearGradient(0, 0, 0, H);
      grad.addColorStop(0, '#020617');
      grad.addColorStop(0.5, '#0f172a');
      grad.addColorStop(1, '#1e293b');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);

      ctx.save();
      ctx.globalAlpha = 0.06;
      ctx.strokeStyle = '#1f2937';
      for (let x = 0; x <= W; x += 60) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, H);
        ctx.stroke();
      }
      for (let y = 0; y <= H; y += 60) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(W, y);
        ctx.stroke();
      }
      ctx.restore();

      // soft halo behind content
      const halo = ctx.createRadialGradient(W / 2, H / 3, 40, W / 2, H / 3, 420);
      halo.addColorStop(0, 'rgba(56, 189, 248, 0.45)');
      halo.addColorStop(1, 'rgba(56, 189, 248, 0)');
      ctx.fillStyle = halo;
      ctx.fillRect(0, 0, W, H);

      // frame
      ctx.lineWidth = 18;
      ctx.strokeStyle = '#020617';
      ctx.strokeRect(40, 40, W - 80, H - 80);
      ctx.lineWidth = 6;
      ctx.strokeStyle = '#38bdf8';
      ctx.strokeRect(64, 64, W - 128, H - 128);

      // scoreboard panel
      const panelX = 110;
      const panelY = 260;
      const panelW = W - 220;
      const panelH = 520;
      ctx.fillStyle = '#020617';
      ctx.fillRect(panelX, panelY, panelW, panelH);
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 4;
      ctx.strokeRect(panelX, panelY, panelW, panelH);

      // brand box (outside panel)
      const brandX = panelX;
      const brandY = 110;
      const brandW = 460;
      const brandH = 64;
      ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
      ctx.fillRect(brandX, brandY, brandW, brandH);
      ctx.strokeStyle = '#4b5563';
      ctx.lineWidth = 2.5;
      ctx.strokeRect(brandX, brandY, brandW, brandH);
      ctx.font = '700 20px "Arial Black"';
      ctx.fillStyle = '#e5e7eb';
      ctx.fillText('The Nineties Times exclusive', brandX + 18, brandY + 26);
      ctx.font = '800 22px "Arial Black"';
      ctx.fillStyle = '#38bdf8';
      ctx.fillText('90sTimes.com', brandX + 18, brandY + 50);

      // score label and numbers
      ctx.font = '600 30px "Arial Black"';
      ctx.fillStyle = '#a5b4fc';
      ctx.fillText('Score', panelX + 32, panelY + 70);

      ctx.font = '900 120px "Arial Black"';
      ctx.fillStyle = '#22c55e';
      ctx.fillText(`${correctCount}/${total}`, panelX + 32, panelY + 190);

      // quiz title, wrapped to keep the full name visible
      ctx.font = '600 40px "Arial Black"';
      ctx.fillStyle = '#e5e7eb';
      const quizLabel = `Quiz: ${quiz.title}`;
      const words = quizLabel.split(/\s+/);
      const maxWidth = panelW - 80;
      const lineHeight = 48;
      let line = '';
      const lineY = panelY + 240;
      const lines: string[] = [];
      for (let i = 0; i < words.length; i += 1) {
        const testLine = line ? `${line} ${words[i]}` : words[i];
        const { width } = ctx.measureText(testLine);
        if (width > maxWidth && line) {
          lines.push(line);
          line = words[i];
        } else {
          line = testLine;
        }
      }
      if (line) lines.push(line);
      for (let i = 0; i < lines.length && i < 3; i += 1) {
        ctx.fillText(lines[i], panelX + 32, lineY + i * lineHeight);
      }

      // rank + stats
      ctx.font = '800 58px "Arial Black"';
      ctx.fillStyle = '#fb7185';
      const rankY = panelY + panelH - 145;
      ctx.fillText(rankLabel, panelX + 32, rankY);

      if (rankDetail) {
        ctx.font = '400 26px Arial';
        ctx.fillStyle = '#cbd5f5';
        const detailWords = rankDetail.split(/\s+/);
        const detailLines: string[] = [];
        const detailMaxWidth = panelW - 80;
        const detailLineHeight = 30;
        let detailLine = '';
        const detailStartY = rankY + 32;
        for (let i = 0; i < detailWords.length; i += 1) {
          const testLine = detailLine ? `${detailLine} ${detailWords[i]}` : detailWords[i];
          const { width } = ctx.measureText(testLine);
          if (width > detailMaxWidth && detailLine) {
            detailLines.push(detailLine);
            detailLine = detailWords[i];
          } else {
            detailLine = testLine;
          }
        }
        if (detailLine) detailLines.push(detailLine);
        for (let i = 0; i < detailLines.length && i < 2; i += 1) {
          ctx.fillText(detailLines[i], panelX + 32, detailStartY + i * detailLineHeight);
        }
      }

      ctx.font = '600 32px "Arial Black"';
      ctx.fillStyle = '#93c5fd';
      ctx.fillText(`Points: ${earnedPoints} | Accuracy: ${percent}%`, panelX + 32, panelY + panelH - 50);
      // footer bar
      const footerY = H - 160;
      ctx.fillStyle = '#020617';
      ctx.fillRect(panelX, footerY, panelW, 110);
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 3;
      ctx.strokeRect(panelX, footerY, panelW, 110);
      ctx.font = '600 34px "Arial Black"';
      ctx.fillStyle = '#e5e7eb';
      ctx.fillText('Quiz powered by 90sTimes.com', panelX + 28, footerY + 60);
      ctx.font = '400 26px Arial';
      ctx.fillStyle = '#9ca3af';
      ctx.fillText(new Date().toLocaleDateString(), panelX + 28, footerY + 94);

      const data = canvas.toDataURL('image/png');
      setShareImgUrl(data);
    } catch {}
  }

  async function sharePoster() {
    try {
      if (!shareImgUrl) return;
      const res = await fetch(shareImgUrl);
      const blob = await res.blob();
      const file = new File([blob], `${quiz.slug}-score.png`, { type: 'image/png' });
      const shareUrl = typeof window !== 'undefined' ? window.location.href : undefined;
      const shareData: ShareData = {
        title: shareTitle,
        text: shareTitle,
        files: [file],
        ...(shareUrl ? { url: shareUrl } : {}),
      } as ShareData;
      const nav = navigator as Navigator & { canShare?: (data: { files?: File[]; title?: string; text?: string; url?: string }) => boolean; share?: (data: ShareData) => Promise<void> };
      if (nav.canShare && nav.canShare({ files: [file] }) && nav.share) {
        await nav.share(shareData);
        return;
      }
    } catch {}
  }

  async function copyPosterToClipboard() {
    try {
      if (!shareImgUrl) return;
      const res = await fetch(shareImgUrl);
      const blob = await res.blob();
      type ClipboardItemCtor = new (data: Record<string, Blob>) => unknown;
      const CI = (window as unknown as { ClipboardItem?: ClipboardItemCtor }).ClipboardItem;
      const navClip = (navigator as unknown as { clipboard?: { write?: (items: unknown[]) => Promise<void> } }).clipboard;
      if (!CI || !navClip?.write) return;
      const item = new CI({ [blob.type]: blob });
      await navClip.write([item]);
    } catch {}
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.metaBar}>
        <RetroBackLink className={styles.backLink} variant="ghost" />
        <div className={styles.chipRow}>
          {quiz.category && <span className={styles.chip}>{quiz.category}</span>}
          <span className={styles.chip}>{quiz.type}</span>
        </div>
      </div>
      <div className={styles.header}>
        <h2 className={styles.title}>{quiz.title}</h2>
      </div>
      <div className={styles.progress} aria-label="Progress">
        <div className={styles.progressBar} style={{ width: `${progress}%` }} />
      </div>
      {typeof timeLeft === 'number' && (
        <div className={styles.timer} role="timer" aria-label="Time remaining">
          <div className={styles.timerBar} style={{ width: `${Math.max(0, Math.min(100, (timeLeft / (quiz.timeLimitSec || 1)) * 100))}%` }} />
        </div>
      )}

      {!completed ? (
        <div className={styles.card}>
          <div className={styles.prompt}>{q.prompt}</div>
          {questionImage && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              className={styles.image}
              src={questionImage}
              alt="Question image"
              loading="lazy"
              decoding="async"
            />
          )}
          {q.choices && q.choices.length > 0 ? (
            <div className={styles.choices}>
              {(choiceOrder[q.id] ?? q.choices.map((_, i) => i)).map((idx) => {
                const c = q.choices![idx];
                const key = `${q.id}-${idx}`;
                return (
                <button
                  key={key}
                  className={styles.choiceBtn}
                  onClick={() => choose(c)}
                  disabled={!!locked[q.id]}
                  data-selected={answers[q.id] === c}
                  data-locked={!!locked[q.id]}
                  data-correct={!!locked[q.id] && c.trim().toLowerCase() === q.answer.trim().toLowerCase()}
                >
                  {c}
                </button>
                );
              })}
            </div>
          ) : (
            <div>
              <input
                type="text"
                placeholder="Type your answer"
                value={answers[q.id] || ''}
                onChange={(e) => { if (!locked[q.id]) setAnswers((prev) => ({ ...prev, [q.id]: e.target.value })); }}
                disabled={!!locked[q.id]}
                style={{ width: '100%', padding: '0.6rem', border: '3px solid #000' }}
              />
              {!locked[q.id] && (
                <div style={{ marginTop: '0.5rem' }}>
                  <button className={styles.primary} onClick={() => setLocked((prev) => ({ ...prev, [q.id]: true }))} disabled={!answers[q.id]}>Lock answer</button>
                </div>
              )}
            </div>
          )}
          <div className={styles.controls}>
            <button className={styles.primary} onClick={prev} disabled={index === 0}>
              Back
            </button>
            <div>
              <button className={styles.primary} onClick={next}>
                {index < total - 1 ? 'Next' : 'Finish'}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className={styles.results}>
          <div className={styles.scoreCard}>
            <div className={styles.scoreBrand}>
              <span className={styles.scoreBrandTag}>The Nineties Times exclusive</span>
              <a
                href="https://www.90stimes.com"
                className={styles.scoreBrandLink}
                target="_blank"
                rel="noopener noreferrer"
              >
                90sTimes.com
              </a>
            </div>
            <div className={styles.scoreMedia}>
              {showImageUrl && (
                <div className={styles.scoreThumb}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={showImageUrl}
                    alt={`${quiz.title} quiz card on The Nineties Times (90sTimes.com)`}
                    loading="lazy"
                    decoding="async"
                  />
                </div>
              )}
              <div className={styles.scoreMain}>
                <div className={styles.scoreTitle}>{quiz.title}</div>
                <div className={styles.scoreMeta}>
                  {total} questions &#183; {earnedPoints}/{totalPoints} points
                </div>
                <div className={styles.scoreStats}>
                  <div className={styles.scoreStatItem}>
                    <span className={styles.scoreLabel}>Correct</span>{' '}
                    <span className={styles.scoreValue}>{correctCount} / {total}</span>
                  </div>
                  <div className={styles.scoreStatItem}>
                    <span className={styles.scoreLabel}>Accuracy</span>{' '}
                    <span className={styles.scoreValue}>{percent}%</span>
                  </div>
                </div>
                <div className={styles.scoreRank}>
                  <span className={styles.scoreRankLabel}>{rankLabel}</span>
                  {rankDetail && <span className={styles.scoreRankBlurb}>{rankDetail}</span>}
                </div>
              </div>
            </div>
            <div className={styles.posterWrap}>
              <canvas ref={canvasRef} className={styles.posterCanvas} aria-label="Shareable score image" />
              <div className={styles.posterActions}>
                {shareImgUrl && (
                  <>
                    <a className={styles.primary} href={shareImgUrl} download={`${quiz.slug}-score.png`}>Download image</a>
                    <button className={styles.primary} onClick={copyPosterToClipboard}>Copy image</button>
                    <button className={styles.primary} onClick={sharePoster}>Share image</button>
                  </>
                )}
              </div>
            </div>
          <p style={{ marginTop: '0.75rem' }}>Share your score:</p>
          <div className={styles.shareBlock}>
            {(() => { try {
              const url = new URL(window.location.href).toString();
              return <ShareButtons url={url} title={shareTitle} size="md" />;
            } catch { return null; } })()}
            {shareImgUrl && (
              <div style={{ marginTop: '0.5rem' }}>
                <button
                  className={styles.primary}
                  onClick={async () => {
                    try {
                      if (!shareImgUrl) return;
                      if (!shareLink) {
                        const res = await fetch('/api/quiz-share', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ imageData: shareImgUrl, slug: quiz.slug, title: quiz.title, score: `${correctCount}/${total}`, rank: rankLabel }),
                        });
                        if (res.ok) {
                          const data: { id: string; path: string } = await res.json();
                          const origin = window.location.origin;
                          const link = `${origin}${data.path}`;
                          setShareLink(link);
                          window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(link)}`, '_blank', 'noopener');
                          return;
                        }
                      }
                      if (shareLink) {
                        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareLink)}`, '_blank', 'noopener');
                      }
                    } catch {}
                  }}
                >
                  Share scorecard to Facebook
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    )}
    </div>
  );
}







