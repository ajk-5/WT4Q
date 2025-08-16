'use client';
import { useEffect, useState, useRef } from 'react';
import PrefetchLink from '@/components/PrefetchLink';
import styles from './BreakingNewsSlider.module.css';
import type { ArticleImage } from '@/lib/models';
import { stripHtml, truncateWords } from '@/lib/text';
import { API_ROUTES } from '@/lib/api';

export interface BreakingArticle {
  id: string;
  title: string;
  content?: string;
  images?: ArticleImage[];
}

export default function BreakingNewsSlider({
  articles: initialArticles = [],
  className,
  showDetails = false,
}: {
  articles?: BreakingArticle[];
  className?: string;
  showDetails?: boolean;
}) {
  const [articles, setArticles] = useState<BreakingArticle[]>(initialArticles);
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState<'next' | 'prev'>('next');
  const textRef = useRef<HTMLSpanElement>(null);

  const next = () => {
    setDirection('next');
    setIndex((i) => (i + 1) % articles.length);
  };
  const prev = () => {
    setDirection('prev');
    setIndex((i) => (i - 1 + articles.length) % articles.length);
  };

  useEffect(() => {
    if (initialArticles.length === 0) {
      fetch(API_ROUTES.ARTICLE.GET_ALL)
        .then((r) => (r.ok ? r.json() : []))
        .then((data: { id: string; title: string }[]) =>
          setArticles(data.map((a) => ({ id: a.id, title: a.title })))
        )
        .catch(() => setArticles([]));
    }
  }, [initialArticles]);

  useEffect(() => {
    if (articles.length === 0) return;
    const interval = setInterval(next, 5000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [articles]);

  useEffect(() => {
    const el = textRef.current;
    if (!el) return;
    const container = el.parentElement as HTMLElement;
    const offset = el.scrollWidth - container.clientWidth;
    if (offset > 0) {
      el.style.setProperty('--scroll-distance', `-${offset}px`);
      el.style.setProperty('--scroll-duration', `${offset / 50}s`); // 50px/sec
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
  const snippet = current.content
    ? truncateWords(stripHtml(current.content))
    : undefined;

  return (
    <div className={`${styles.slider} ${className ?? ''}`.trim()}>
      <button
        className={`${styles.arrow} ${styles.left}`}
        onClick={prev}
        aria-label="Previous article"
      >
        ‹
      </button>
      <button
        className={`${styles.arrow} ${styles.right}`}
        onClick={next}
        aria-label="Next article"
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
              />
              {first?.caption && (
                <figcaption className={styles.detailCaption}>{first.caption}</figcaption>
              )}
            </figure>
          )}
          <h3 className={styles.detailTitle}>{current.title}</h3>
          {snippet && <p className={styles.snippet}>{snippet}</p>}
          <PrefetchLink href={`/articles/${current.id}`} className={styles.readMore}>
            Read more
          </PrefetchLink>
        </div>
      ) : (
        <div
          className={`${styles.itemWrapper} ${
            direction === 'next' ? styles.slideLeft : styles.slideRight
          }`}
        >
          <PrefetchLink href={`/articles/${current.id}`} className={styles.item}>
            <span ref={textRef}>{current.title}</span>
          </PrefetchLink>
        </div>
      )}
      <div className={styles.dots}>
        {articles.map((_, i) => (
          <button
            key={i}
            className={`${styles.dot} ${i === index ? styles.active : ''}`}
            onClick={() => setIndex(i)}
          />
        ))}
      </div>
    </div>
  );
}
