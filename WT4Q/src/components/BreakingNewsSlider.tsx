'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import styles from './BreakingNewsSlider.module.css';

export interface BreakingArticle {
  id: string;
  title: string;
}

export default function BreakingNewsSlider({
  articles,
  className,
}: {
  articles: BreakingArticle[];
  className?: string;
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

  return (
    <div className={`${styles.slider} ${className ?? ''}`.trim()}>
      <Link href={`/articles/${articles[index].id}`} className={styles.item}>
        {articles[index].title}
      </Link>
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
