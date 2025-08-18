'use client';

import { useEffect, useState } from 'react';
import ArticleCard, { Article } from '@/components/ArticleCard';
import { API_ROUTES } from '@/lib/api';
import styles from './LocalArticleSection.module.css';

export default function LocalArticleSection() {
  const [article, setArticle] = useState<Article | null>(null);

  useEffect(() => {
    const fetchLocal = async () => {
      try {
        const locRes = await fetch(API_ROUTES.USER_LOCATION.GET);
        if (!locRes.ok) return;
        const loc = await locRes.json();
        if (!loc?.country) return;
        const artRes = await fetch(
          `${API_ROUTES.ARTICLE.SEARCH_ADVANCED}?country=${encodeURIComponent(loc.country)}`
        );
        if (!artRes.ok) return;
        const list: Article[] = await artRes.json();
        if (list.length > 0) setArticle(list[0]);
      } catch {
        // swallow errors
      }
    };
    fetchLocal();
  }, []);

  if (!article) return null;

  return (
    <section className={styles.container} aria-label="Local news">
      <h2 className={styles.heading}>News Near You</h2>
      <ArticleCard article={article} />
    </section>
  );
}
