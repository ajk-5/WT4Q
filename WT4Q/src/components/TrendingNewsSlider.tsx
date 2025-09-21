
'use client';

import Image from 'next/image';
import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import PrefetchLink from '@/components/PrefetchLink';
import styles from './TrendingNewsSlider.module.css';
import type { ArticleImage } from '@/lib/models';
import { stripHtml, truncateWords } from '@/lib/text';
import { API_ROUTES, apiFetch } from '@/lib/api';

export interface TrendingArticle {
  id: string;
  slug: string;
  title: string;
  content?: string;
  images?: ArticleImage[];
  createdDate?: string;
  rank?: number;
}

type Props = {
  /** If provided (non-empty), component will NOT fetch. */
  articles?: TrendingArticle[];
  className?: string;
  showDetails?: boolean;
};

const ROTATE_MS = 5000;
const TICKER_BREAKPOINT = 768;
const TICKER_PIXELS_PER_SEC = 24;
const TICKER_SCROLL_RATIO = 0.85;
const TICKER_PAUSE_AFTER_ARROW_MS = 4000;
const TWO_DAYS_MS = 1000 * 60 * 60 * 48;

export default function TrendingNewsSlider({
  articles: initialArticles,
  className,
  showDetails = false,
}: Props) {
  const [articles, setArticles] = useState<TrendingArticle[]>(() => initialArticles ?? []);
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState<'next' | 'prev'>('next');
  const [manualPause, setManualPause] = useState(false);
  const [isSmallViewport, setIsSmallViewport] = useState(false);
  const [tickerPaused, setTickerPaused] = useState(false);

  const fetchedOnceRef = useRef(false);
  const textRef = useRef<HTMLSpanElement>(null);
  const tickerViewportRef = useRef<HTMLDivElement>(null);
  const tickerTrackRef = useRef<HTMLDivElement>(null);
  const tickerPauseTimeoutRef = useRef<number | null>(null);
  const tickerFrameTimeRef = useRef<number | null>(null);
  const tickerBaseWidthRef = useRef<number>(0);

  const needFetch = useMemo(
    () => !(initialArticles && initialArticles.length > 0),
    [initialArticles],
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const updateViewport = () => setIsSmallViewport(window.innerWidth <= TICKER_BREAKPOINT);
    updateViewport();
    window.addEventListener('resize', updateViewport);
    return () => window.removeEventListener('resize', updateViewport);
  }, []);

  const isTickerMode = !showDetails && isSmallViewport && articles.length > 0;

  const tickerBaseArticles = useMemo(() => {
    if (!articles.length) return [];
    const threshold = Date.now() - TWO_DAYS_MS;
    const recent = articles.filter((article) => {
      if (!article.createdDate) return false;
      const ts = new Date(article.createdDate).getTime();
      return Number.isFinite(ts) && ts >= threshold;
    });
    const base = (recent.length >= 2 ? recent : articles).slice(0, 40);
    return base;
  }, [articles]);

  const tickerLoop = useMemo(() => {
    if (!isTickerMode) return [] as TrendingArticle[];
    if (!tickerBaseArticles.length) return [] as TrendingArticle[];
    return [...tickerBaseArticles, ...tickerBaseArticles];
  }, [isTickerMode, tickerBaseArticles]);

  const tickerBaseLength = tickerBaseArticles.length || 1;
  const tickerKey = useMemo(
    () => (isTickerMode ? tickerBaseArticles.map((article) => article.id).join('|') : ''),
    [isTickerMode, tickerBaseArticles],
  );

  useEffect(() => {
    if (!isTickerMode) return undefined;
    const viewport = tickerViewportRef.current;
    if (viewport) viewport.scrollLeft = 0;
    return undefined;
  }, [isTickerMode, tickerKey]);

  useEffect(() => {
    if (!isTickerMode) return undefined;
    const viewport = tickerViewportRef.current;
    const track = tickerTrackRef.current;
    if (!viewport || !track || !tickerLoop.length) return undefined;

    let frameId = 0;
    tickerFrameTimeRef.current = null;
    const measure = () => {
      tickerBaseWidthRef.current = track.scrollWidth / 2;
    };
    measure();
    const onResize = () => measure();
    window.addEventListener('resize', onResize);

    const step = (time: number) => {
      if (!tickerPaused) {
        const baseWidth = tickerBaseWidthRef.current;
        if (baseWidth > 0) {
          const last = tickerFrameTimeRef.current;
          if (last === null) {
            tickerFrameTimeRef.current = time;
          } else {
            const delta = Math.min(time - last, 1000);
            const distance = (TICKER_PIXELS_PER_SEC * delta) / 1000;
            let next = viewport.scrollLeft + distance;
            if (next >= baseWidth) {
              next %= baseWidth;
            }
            viewport.scrollLeft = next;
            tickerFrameTimeRef.current = time;
          }
        }
      } else {
        tickerFrameTimeRef.current = time;
      }
      frameId = window.requestAnimationFrame(step);
    };

    frameId = window.requestAnimationFrame(step);
    return () => {
      if (frameId) window.cancelAnimationFrame(frameId);
      tickerFrameTimeRef.current = null;
      window.removeEventListener('resize', onResize);
    };
  }, [isTickerMode, tickerPaused, tickerLoop.length, tickerKey]);

  useEffect(() => {
    tickerFrameTimeRef.current = null;
  }, [tickerPaused, isTickerMode]);

  useEffect(() => () => {
    if (tickerPauseTimeoutRef.current) {
      window.clearTimeout(tickerPauseTimeoutRef.current);
      tickerPauseTimeoutRef.current = null;
    }
  }, []);

  const autoRotateEnabled = !showDetails && !isTickerMode && articles.length >= 2;

  const pauseTickerTemporarily = (ms = TICKER_PAUSE_AFTER_ARROW_MS) => {
    if (!isTickerMode) return;
    setTickerPaused(true);
    tickerFrameTimeRef.current = null;
    if (tickerPauseTimeoutRef.current) {
      window.clearTimeout(tickerPauseTimeoutRef.current);
    }
    tickerPauseTimeoutRef.current = window.setTimeout(() => {
      tickerPauseTimeoutRef.current = null;
      setTickerPaused(() => { tickerFrameTimeRef.current = null; return false; });
    }, ms);
  };

  const clearTickerPauseTimeout = () => {
    if (tickerPauseTimeoutRef.current) {
      window.clearTimeout(tickerPauseTimeoutRef.current);
      tickerPauseTimeoutRef.current = null;
    }
  };

  const scrollTicker = (direction: 'next' | 'prev') => {
    if (!isTickerMode) return;
    const viewport = tickerViewportRef.current;
    const track = tickerTrackRef.current;
    if (!viewport || !track) return;
    const baseWidth = track.scrollWidth / 2;
    if (baseWidth <= 0) return;
    const step = viewport.clientWidth * TICKER_SCROLL_RATIO;
    let target = viewport.scrollLeft + (direction === 'next' ? step : -step);
    if (target < 0) {
      target = (target % baseWidth + baseWidth) % baseWidth;
    } else if (target >= baseWidth) {
      target = target % baseWidth;
    }
    viewport.scrollTo({ left: target, behavior: 'smooth' });
    tickerFrameTimeRef.current = null;
    pauseTickerTemporarily();
  };

  const next = () => {
    if (isTickerMode) {
      scrollTicker('next');
      return;
    }
    if (articles.length < 2) return;
    setDirection('next');
    setIndex((i) => (i + 1) % articles.length);
  };

  const prev = () => {
    if (isTickerMode) {
      scrollTicker('prev');
      return;
    }
    if (articles.length < 2) return;
    setDirection('prev');
    setIndex((i) => (i - 1 + articles.length) % articles.length);
  };

  useEffect(() => {
    if (initialArticles && initialArticles.length > 0) {
      setArticles(initialArticles);
      setIndex(0);
    }
  }, [initialArticles]);

  useEffect(() => {
    if (!needFetch) return undefined;
    if (fetchedOnceRef.current) return undefined;
    fetchedOnceRef.current = true;

    const ac = new AbortController();
    (async () => {
      const res = await apiFetch(API_ROUTES.ARTICLE.TRENDING(), {
        signal: ac.signal,
        headers: { Accept: 'application/json' },
        cache: 'no-store',
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const data: { id: string; slug: string; title: string; createdDate?: string }[] = await res.json();
      setArticles(
        data
          .sort(
            (a, b) =>
              new Date(b.createdDate ?? 0).getTime() -
              new Date(a.createdDate ?? 0).getTime(),
          )
          .slice(0, 20)
          .map((a, i) => ({
            id: a.id,
            slug: a.slug,
            title: a.title,
            createdDate: a.createdDate,
            rank: i + 1,
          })),
      );
      setIndex(0);
    })().catch((err: unknown) => {
      if (!(err instanceof Error) || err.name !== 'AbortError') {
        setArticles([]);
      }
    });

    return () => ac.abort();
  }, [needFetch]);

  useEffect(() => {
    if (index >= articles.length) setIndex(0);
  }, [articles.length, index]);

  useEffect(() => {
    if (!autoRotateEnabled || manualPause) return undefined;
    const timer = window.setInterval(() => {
      setDirection('next');
      setIndex((current) => (articles.length < 2 ? current : (current + 1) % articles.length));
    }, ROTATE_MS);
    return () => window.clearInterval(timer);
  }, [autoRotateEnabled, manualPause, articles.length]);

  useEffect(() => {
    const el = textRef.current;
    const container = el?.parentElement as HTMLElement | null;
    if (!el || !container) return;

    const offset = el.scrollWidth - container.clientWidth;
    if (offset > 0) {
      el.style.setProperty('--scroll-distance', `-${offset}px`);
      el.style.setProperty('--scroll-duration', `${offset / 50}s`);
      el.classList.add(styles.marquee);
    } else {
      el.classList.remove(styles.marquee);
    }
  }, [index, articles]);

  useEffect(() => {
    if (!autoRotateEnabled) {
      setManualPause(false);
    }
  }, [autoRotateEnabled]);

  const hasArticles = articles.length > 0;
  const sliderClassName = [
    styles.slider,
    className ?? '',
    showDetails ? styles.detailMode : styles.compactMode,
    hasArticles ? '' : styles.isLoading,
    isTickerMode ? styles.tickerEnabled : '',
  ]
    .filter(Boolean)
    .join(' ');

  const current = hasArticles ? articles[index] : undefined;
  const first = current?.images?.[0];
  const base64 = first?.photo ? `data:image/jpeg;base64,${first.photo}` : undefined;
  const imageSrc = first?.photoLink || base64;
  const snippet = current?.content
    ? truncateWords(stripHtml(current.content), 130)
    : undefined;
  const title = current?.title ?? '';
  const slug = current?.slug ?? '#';
  const disableArrows = !isTickerMode && articles.length < 2;

  const handleSliderMouseEnter = () => {
    if (!autoRotateEnabled) return;
    setManualPause(true);
  };

  const handleSliderMouseLeave = () => {
    if (!autoRotateEnabled) return;
    setManualPause(false);
  };

  const handleTickerMouseEnter = () => {
    if (!isTickerMode) return;
    clearTickerPauseTimeout();
    setTickerPaused(true);
  };

  const handleTickerMouseLeave = () => {
    if (!isTickerMode) return;
    clearTickerPauseTimeout();
    setTickerPaused(() => { tickerFrameTimeRef.current = null; return false; });
  };

  const handleTickerPointerDown = () => {
    if (!isTickerMode) return;
    clearTickerPauseTimeout();
    setTickerPaused(true);
  };

  const handleTickerPointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!isTickerMode) return;
    if (event.pointerType === 'touch') {
      pauseTickerTemporarily(2500);
    } else {
      setTickerPaused(() => { tickerFrameTimeRef.current = null; return false; });
    }
  };

  const handleTickerPointerCancel = () => {
    if (!isTickerMode) return;
    clearTickerPauseTimeout();
    setTickerPaused(() => { tickerFrameTimeRef.current = null; return false; });
  };

  const tickerContent = isTickerMode && hasArticles ? (
    <div
      className={styles.tickerViewport}
      ref={tickerViewportRef}
      onMouseEnter={handleTickerMouseEnter}
      onMouseLeave={handleTickerMouseLeave}
      onPointerDown={handleTickerPointerDown}
      onPointerUp={handleTickerPointerUp}
      onPointerCancel={handleTickerPointerCancel}
    >
      <div className={styles.tickerTrack} ref={tickerTrackRef}>
        {tickerLoop.map((article, loopIndex) => {
          const isCycleStart = loopIndex % tickerBaseLength === 0;
          return (
            <Fragment key={`${article.id}-${loopIndex}`}>
              {!isCycleStart && <span className={styles.tickerSeparator} aria-hidden="true" />}
              <PrefetchLink
                href={`/articles/${article.slug}`}
                className={styles.tickerItem}
                data-ticker-item="true"
              >
                <span>{article.title}</span>
              </PrefetchLink>
            </Fragment>
          );
        })}
      </div>
    </div>
  ) : null;

  return (
    <div
      className={sliderClassName}
      onMouseEnter={hasArticles ? handleSliderMouseEnter : undefined}
      onMouseLeave={hasArticles ? handleSliderMouseLeave : undefined}
      aria-busy={!hasArticles}
    >
      <button
        className={`${styles.arrow} ${styles.left}`}
        onClick={prev}
        aria-label="Previous article"
        type="button"
        disabled={disableArrows}
      >
        <svg viewBox="0 0 32 32" width="32" height="32" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false" fill="#000000">
          <g fill="#000000">
            <path d="M281,1106 L270.414,1106 L274.536,1110.12 C274.926,1110.51 274.926,1111.15 274.536,1111.54 C274.145,1111.93 273.512,1111.93 273.121,1111.54 L267.464,1105.88 C267.225,1105.64 267.15,1105.31 267.205,1105 C267.15,1104.69 267.225,1104.36 267.464,1104.12 L273.121,1098.46 C273.512,1098.07 274.145,1098.07 274.536,1098.46 C274.926,1098.86 274.926,1099.49 274.536,1099.88 L270.414,1104 L281,1104 C281.552,1104 282,1104.45 282,1105 C282,1105.55 281.552,1106 281,1106 L281,1106 Z M274,1089 C265.164,1089 258,1096.16 258,1105 C258,1113.84 265.164,1121 274,1121 C282.836,1121 290,1113.84 290,1105 C290,1096.16 282.836,1089 274,1089 L274,1089 Z" transform="translate(-258 -1089)" />
          </g>
        </svg>
      </button>

      <button
        className={`${styles.arrow} ${styles.right}`}
        onClick={next}
        aria-label="Next article"
        type="button"
        disabled={disableArrows}
      >
        <svg viewBox="0 0 32 32" width="32" height="32" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false" fill="#000000">
          <g fill="#000000">
            <path d="M332.535,1105.88 L326.879,1111.54 C326.488,1111.93 325.855,1111.93 325.465,1111.54 C325.074,1111.15 325.074,1110.51 325.465,1110.12 L329.586,1106 L319,1106 C318.447,1106 318,1105.55 318,1105 C318,1104.45 318.447,1104 319,1104 L329.586,1104 L325.465,1099.88 C325.074,1099.49 325.074,1098.86 325.465,1098.46 C325.855,1098.07 326.488,1098.07 326.879,1098.46 L332.535,1104.12 C332.775,1104.36 332.85,1104.69 332.795,1105 C332.85,1105.31 332.775,1105.64 332.535,1105.88 L332.535,1105.88 Z M326,1089 C317.163,1089 310,1096.16 310,1105 C310,1113.84 317.163,1121 326,1121 C334.837,1121 342,1113.84 342,1105 C342,1096.16 334.837,1089 326,1089 L326,1089 Z" transform="translate(-310 -1089)" />
          </g>
        </svg>
      </button>

      {showDetails ? (
        hasArticles ? (
          <PrefetchLink href={`/articles/${slug}`} className={styles.detailLink}>
            <div className={`${styles.detail} ${!imageSrc ? styles.detailNoImage : ''}`.trim()}>
              {imageSrc ? (
                <figure className={styles.detailFigure}>
                  <Image
                    src={imageSrc}
                    alt={first?.altText || title}
                    fill
                    priority={index === 0}
                    fetchPriority={index === 0 ? 'high' : 'auto'}
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 800px, 900px"
                    style={{ objectFit: 'cover' }}
                    placeholder={base64 ? 'blur' : undefined}
                    blurDataURL={base64}
                  />
                  {first?.caption ? (
                    <figcaption className={styles.detailCaption}>{first.caption}</figcaption>
                  ) : null}
                </figure>
              ) : null}
              <h3 className={styles.detailTitle}>{title}</h3>
              {snippet ? (
                <p className={styles.snippet}>
                  {snippet}
                  <span className={styles.readMore}> READ MORE...</span>
                </p>
              ) : (
                <div className={styles.snippetPlaceholder} aria-hidden="true">
                  <span />
                  <span />
                  <span />
                  <span />
                  <span />
                  <span />
                  <span />
                  <span />
                </div>
              )}
            </div>
          </PrefetchLink>
        ) : (
          <div className={styles.detail}>
            <div className={`${styles.detailFigure} ${styles.detailFigurePlaceholder}`} aria-hidden="true">
              <div className={styles.mediaPlaceholder} />
            </div>
            <div className={styles.titlePlaceholder} aria-hidden="true" />
            <div className={styles.snippetPlaceholder} aria-hidden="true">
              <span />
              <span />
              <span />
              <span />
              <span />
              <span />
              <span />
              <span />
            </div>
          </div>
        )
      ) : isTickerMode ? (
        tickerContent ?? (
          <div className={styles.tickerPlaceholder} aria-hidden="true">
            <span />
          </div>
        )
      ) : (
        <div
          className={`${styles.itemWrapper} ${
            hasArticles ? (direction === 'next' ? styles.slideLeft : styles.slideRight) : ''
          }`.trim()}
        >
          {hasArticles ? (
            <PrefetchLink href={`/articles/${slug}`} className={styles.item}>
              <span ref={hasArticles ? textRef : null}>{title}</span>
            </PrefetchLink>
          ) : (
            <div className={styles.tickerPlaceholder} aria-hidden="true">
              <span />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
