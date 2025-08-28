'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
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

export default function TrendingNewsSlider({
  articles: initialArticles,
  className,
  showDetails = false,
}: Props) {
  // initialize from props once; if props later become non-empty, we sync via an effect below
  const [articles, setArticles] = useState<TrendingArticle[]>(() => initialArticles ?? []);
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState<'next' | 'prev'>('next');

  // prevent duplicate fetch in React 18 dev Strict Mode
  const fetchedOnceRef = useRef(false);
  // used for marquee calc
  const textRef = useRef<HTMLSpanElement>(null);

  // 👇 key: stable boolean, not the array reference
  const needFetch = useMemo(
    () => !(initialArticles && initialArticles.length > 0),
    [initialArticles?.length],
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
  }, [initialArticles?.length]);

  // Fetch when we weren't given any articles
  useEffect(() => {
    if (!needFetch) return;
    if (fetchedOnceRef.current) return;
    fetchedOnceRef.current = true;

    const ac = new AbortController();
    (async () => {
      const res = await apiFetch(API_ROUTES.ARTICLE.TRENDING(), {
        signal: ac.signal,
        headers: { Accept: 'application/json' },
        cache: 'no-store',
      });
      if (!res.ok) {
        // don’t silently loop on 4xx/5xx
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
    if (articles.length < 2) return;
    const t = setInterval(next, ROTATE_MS);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [articles.length]);

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

  if (articles.length === 0) return null;

  const current = articles[index];
  const first = current.images?.[0];
  const base64 = first?.photo ? `data:image/jpeg;base64,${first.photo}` : undefined;
  const imageSrc = first?.photoLink || base64;
  const snippet = current.content ? truncateWords(stripHtml(current.content)) : undefined;

  return (
    <div className={`${styles.slider} ${className ?? ''}`.trim()}>
      <button
        className={`${styles.arrow} ${styles.left}`}
        onClick={prev}
        aria-label="Previous article"
        type="button"
      >
        ‹
      </button>

      <button
        className={`${styles.arrow} ${styles.right}`}
        onClick={next}
        aria-label="Next article"
        type="button"
      >
        ›
      </button>

      {showDetails ? (
        <div className={styles.detail}>
          {imageSrc && (
            <figure className={styles.detailFigure}>
              <img
                src={imageSrc}
                alt={first?.altText || current.title}
                className={styles.detailImage}
                loading="lazy"
                decoding="async"
              />
              {first?.caption && (
                <figcaption className={styles.detailCaption}>{first.caption}</figcaption>
              )}
            </figure>
          )}
          {current.rank && (
            <span className={styles.rank}>{`#${current.rank}`}</span>
          )}
          <h3 className={styles.detailTitle}>{current.title}</h3>
          {snippet && <p className={styles.snippet}>{snippet}</p>}
          <PrefetchLink href={`/articles/${current.slug}`} className={styles.readMore}>
            Read more
          </PrefetchLink>
        </div>
      ) : (
        <div
          className={`${styles.itemWrapper} ${
            direction === 'next' ? styles.slideLeft : styles.slideRight
          }`}
        >
          <PrefetchLink href={`/articles/${current.slug}`} className={styles.item}>
            <span ref={textRef}>{`#${current.rank} ${current.title}`}</span>
          </PrefetchLink>
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
