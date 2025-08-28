'use client';

import { useCallback, useEffect, useState } from 'react';
import ArticleCard, { Article } from '@/components/ArticleCard';
import { API_ROUTES } from '@/lib/api';
import countries from '../../public/datas/Countries.json';
import styles from './LocalArticleSection.module.css';

const ROTATE_MS = 5000;

export default function LocalArticleSection() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [index, setIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  const next = useCallback(() => {
    if (articles.length < 2) return;
    setIndex((i) => (i + 1) % articles.length);
  }, [articles.length]);

  const prev = useCallback(() => {
    if (articles.length < 2) return;
    setIndex((i) => (i - 1 + articles.length) % articles.length);
  }, [articles.length]);

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
          if (!res.ok) return [] as Article[];
          const list: Article[] = await res.json();
          return list
            .sort(
              (a, b) =>
                new Date(b.createdDate ?? 0).getTime() -
                new Date(a.createdDate ?? 0).getTime()
            )
            .slice(0, 5);
        };

        let arts: Article[] = [];
        if (country?.code) {
          arts = await fetchBy('countryCode', country.code);
        }
        if (arts.length === 0 && country?.name) {
          arts = await fetchBy('countryName', country.name);
        }

        if (arts.length > 0) setArticles(arts);
      } catch {
        // swallow errors
      }
    };
    fetchLocal();
  }, []);

  useEffect(() => {
    if (articles.length < 2 || isHovered) return;
    const t = setInterval(next, ROTATE_MS);
    return () => clearInterval(t);
  }, [articles.length, isHovered, next]);

  if (articles.length === 0) return null;

  const current = articles[index];

  return (
    <section className={styles.container} aria-label="Local news">
      <h2 className={styles.heading}>Local News based on your location</h2>
      <div
        className={styles.slider}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {articles.length > 1 && (
          <>
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
          </>
        )}
        <ArticleCard key={current.id} article={current} />
      </div>
    </section>
  );
}
