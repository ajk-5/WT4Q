'use client';

import { useEffect, useState } from 'react';
import ArticleCard, { Article } from '@/components/ArticleCard';
import { API_ROUTES } from '@/lib/api';
import countries from '../../public/datas/Countries.json';
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

        const country = (countries as { name: string; code: string }[]).find(
          (c) =>
            c.code.toLowerCase() === loc.country.toLowerCase() ||
            c.name.toLowerCase() === loc.country.toLowerCase()
        );

        const fetchBy = async (param: string, value: string) => {
          const res = await fetch(
            `${API_ROUTES.ARTICLE.FILTER}?${param}=${encodeURIComponent(value)}`
          );
          if (!res.ok) return null;
          const list: Article[] = await res.json();
          return list.length > 0 ? list[0] : null;
        };

        let art: Article | null = null;
        if (country?.code) {
          art = await fetchBy('countryCode', country.code);
        }
        if (!art && country?.name) {
          art = await fetchBy('countryName', country.name);
        }

        if (art) setArticle(art);
      } catch {
        // swallow errors
      }
    };
    fetchLocal();
  }, []);

  if (!article) return null;

  return (
    <section className={styles.container} aria-label="Local news">
      <h2 className={styles.heading}>Local News based on your location</h2>
      <ArticleCard article={article} />
    </section>
  );
}
