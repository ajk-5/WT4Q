'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import styles from './BreakingNewsSlider.module.css';
import type { ArticleImage } from '@/lib/models';

export interface BreakingArticle {
  id: string;
  title: string;
  content?: string;
  images?: ArticleImage[];
}

export default function BreakingNewsSlider({
  articles,
  className,
  showDetails = false,
}: {
  articles: BreakingArticle[];
  className?: string;
  showDetails?: boolean;
}) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (articles.length === 0) return;
    const interval = setInterval(() => {
      setIndex((i) => (i + 1) % articles.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [articles]);

  if (articles.length === 0) return null;

  const current = articles[index];
  const first = current.images?.[0];
  const base64 = first?.photo ? `data:image/jpeg;base64,${first.photo}` : undefined;
  const imageSrc = first?.photoLink || base64;

  return (
    <div className={`${styles.slider} ${className ?? ''}`.trim()}>
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
          {current.content && (
            <p className={styles.snippet}>
              {current.content.split(/\s+/).slice(0, 20).join(' ')}...
            </p>
          )}
          <Link href={`/articles/${current.id}`} className={styles.readMore}>
            Read more
          </Link>
        </div>
      ) : (
        <Link href={`/articles/${current.id}`} className={styles.item}>
          {current.title}
        </Link>
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
