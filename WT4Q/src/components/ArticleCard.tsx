"use client";

import { useRef, useState } from 'react';
import PrefetchLink from '@/components/PrefetchLink';
import styles from './ArticleCard.module.css';
import { truncateWords } from '@/lib/text';

export interface Article {
  id: string;
  slug: string;
  title: string;
  summary: string;
  createdDate?: string;
  views?: number;
}

export default function ArticleCard({ article }: { article: Article }) {
  const [showPreview, setShowPreview] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const snippet = truncateWords(article.summary, 50);

  function startPreview() {
    timerRef.current = setTimeout(() => setShowPreview(true), 2000);
  }

  function stopPreview() {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    setShowPreview(false);
  }

  return (
    <div
      className={styles.card}
      onMouseEnter={startPreview}
      onMouseLeave={stopPreview}
      onTouchStart={(e) => {
        e.preventDefault();
        startPreview();
      }}
      onTouchEnd={stopPreview}
      onTouchCancel={stopPreview}
    >
      <h2 className={styles.title}>{article.title}</h2>
      {typeof article.views === 'number' && (
        <p className={styles.views}>
          {article.views.toLocaleString()} views
        </p>
      )}
      {showPreview && (
        <div className={styles.preview}>
          <p
            className={styles.summary}
            dangerouslySetInnerHTML={{ __html: snippet }}
          />
          <PrefetchLink
            href={`/articles/${article.slug}`}
            className={styles.readMore}
          >
            Read more
          </PrefetchLink>
        </div>
      )}
    </div>
  );
}
