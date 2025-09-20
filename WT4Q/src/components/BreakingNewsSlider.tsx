'use client';
import Image from 'next/image';
import { useEffect, useMemo, useRef, useState } from 'react';
import PrefetchLink from '@/components/PrefetchLink';
import styles from './BreakingNewsSlider.module.css';
import type { ArticleImage } from '@/lib/models';
import { stripHtml, truncateWords } from '@/lib/text';
import { API_ROUTES, apiFetch } from '@/lib/api';

export interface BreakingArticle {
  id: string;
  slug: string;
  title: string;
  content?: string;
  images?: ArticleImage[];
  createdDate?: string;
}

type Props = {
  /** If provided (non-empty), component will NOT fetch. */
  articles?: BreakingArticle[];
  className?: string;
  showDetails?: boolean;
};

const ROTATE_MS = 5000;

export default function BreakingNewsSlider({
  articles: initialArticles,
  className,
  showDetails = false,
}: Props) {
  // initialize from props once; if props later become non-empty, we sync via an effect below
  const [articles, setArticles] = useState<BreakingArticle[]>(() => initialArticles ?? []);
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState<'next' | 'prev'>('next');
  const [isHovered, setIsHovered] = useState(false);

  // prevent duplicate fetch in React 18 dev Strict Mode
  const fetchedOnceRef = useRef(false);
  // used for marquee calc
  const textRef = useRef<HTMLSpanElement>(null);

  // dY`� key: stable boolean, not the array reference
  const needFetch = useMemo(
    () => !(initialArticles && initialArticles.length > 0),
    [initialArticles],
  );

  const next = () => {
    if (articles.length < 2) return;
    setDirection('next');
    setIndex((i) => (i + 1) % articles.length);
  };

  const prev = () => {
    if (articles.length < 2) return;
    setDirection('prev');
    setIndex((i) => (i - 1 + articles.length) % articles.length);
  };

  // If parent later provides articles (SSR/CSR timing), sync them in once.
  useEffect(() => {
    if (initialArticles && initialArticles.length > 0) {
      setArticles(initialArticles);
      setIndex(0);
    }
  }, [initialArticles]);

  // Fetch when we weren't given any articles
  useEffect(() => {
    if (!needFetch) return;
    if (fetchedOnceRef.current) return;
    fetchedOnceRef.current = true;

    const ac = new AbortController();
    (async () => {
      const res = await apiFetch(API_ROUTES.ARTICLE.BREAKING, {
        signal: ac.signal,
        headers: { Accept: 'application/json' },
        cache: 'no-store',
      });
      if (!res.ok) {
        // don't silently loop on 4xx/5xx
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
          .map((a) => ({ id: a.id, slug: a.slug, title: a.title, createdDate: a.createdDate })),
      );
      setIndex(0);
    })().catch((err: unknown) => {
      if (!(err instanceof Error) || err.name !== 'AbortError') {
        // Optional: keep empty to render null, or set a fallback message article
        setArticles([]);
      }
    });

    return () => ac.abort();
  }, [needFetch]);

  // Clamp index if list shrinks
  useEffect(() => {
    if (index >= articles.length) setIndex(0);
  }, [articles.length, index]);

  // Auto-rotate only with 2+ items
  useEffect(() => {
    if (articles.length < 2 || isHovered) return;
    const t = setInterval(next, ROTATE_MS);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [articles.length, isHovered]);

  // Marquee if title overflows
  useEffect(() => {
    const el = textRef.current;
    const container = el?.parentElement as HTMLElement | null;
    if (!el || !container) return;

    const offset = el.scrollWidth - container.clientWidth;
    if (offset > 0) {
      el.style.setProperty('--scroll-distance', `-${offset}px`);
      el.style.setProperty('--scroll-duration', `${offset / 50}s`); // ~50px/sec
      el.classList.add(styles.marquee);
    } else {
      el.classList.remove(styles.marquee);
    }
  }, [index, articles]);

  const hasArticles = articles.length > 0;
  const sliderClassName = `${styles.slider} ${className ?? ''} ${
    showDetails ? styles.detailMode : styles.compactMode
  } ${hasArticles ? '' : styles.isLoading}`
    .trim()
    .replace(/\s+/g, ' ');

  const current = hasArticles ? articles[index] : undefined;
  const first = current?.images?.[0];
  const base64 = first?.photo ? `data:image/jpeg;base64,${first.photo}` : undefined;
  const imageSrc = first?.photoLink || base64;
  const snippet = current?.content
    ? truncateWords(stripHtml(current.content), 130)
    : undefined;
  const title = current?.title ?? '';
  const slug = current?.slug ?? '#';
  const disableArrows = articles.length < 2;

  return (
    <div
      className={sliderClassName}
      onMouseEnter={hasArticles ? () => setIsHovered(true) : undefined}
      onMouseLeave={hasArticles ? () => setIsHovered(false) : undefined}
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
            <div className={styles.detail}>
              <figure
                className={`${styles.detailFigure} ${
                  imageSrc ? '' : styles.detailFigurePlaceholder
                }`.trim()}
              >
                {imageSrc ? (
                  <Image
                    src={imageSrc}
                    alt={first?.altText || title}
                    fill
                    priority={index === 0}
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 800px, 900px"
                    style={{ objectFit: 'cover' }}
                    placeholder={base64 ? 'blur' : undefined}
                    blurDataURL={base64}
                    unoptimized={!!base64}
                  />
                ) : (
                  <div className={styles.mediaPlaceholder} aria-hidden="true" />
                )}
                {first?.caption ? (
                  <figcaption className={styles.detailCaption}>{first.caption}</figcaption>
                ) : (
                  <figcaption
                    className={`${styles.detailCaption} ${styles.captionPlaceholder}`}
                    aria-hidden="true"
                  >
                    &nbsp;
                  </figcaption>
                )}
              </figure>
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

      {/* <div className={styles.dots} role="tablist" aria-label="Breaking news">
        {articles.map((_, i) => (
          <button
            key={i}
            type="button"
            role="tab"
            aria-selected={i === index}
            aria-label={`Show item ${i + 1}`}
            className={`${styles.dot} ${i === index ? styles.active : ''}`}
            onClick={() => setIndex(i)}
          />
        ))}
      </div>*/}
    </div>
  );
}
