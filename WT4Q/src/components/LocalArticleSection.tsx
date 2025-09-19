'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import ArticleCard, { Article } from '@/components/ArticleCard';
import { API_ROUTES } from '@/lib/api';
import countries from '../../public/datas/Countries.json';
import styles from './LocalArticleSection.module.css';

const ROTATE_MS = 5000;

type LoadState = 'loading' | 'ready' | 'empty';

export default function LocalArticleSection() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [index, setIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [status, setStatus] = useState<LoadState>('loading');
  const [activated, setActivated] = useState(false);
  const sectionRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (activated) return;

    if (typeof window === 'undefined') {
      setActivated(true);
      return;
    }

    const node = sectionRef.current;
    if (!node) return;

    if (!('IntersectionObserver' in window)) {
      setActivated(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActivated(true);
            observer.disconnect();
            break;
          }
        }
      },
      { rootMargin: '200px 0px', threshold: 0.15 },
    );

    observer.observe(node);

    return () => {
      observer.disconnect();
    };
  }, [activated]);

  const next = useCallback(() => {
    if (articles.length < 2) return;
    setIndex((i) => (i + 1) % articles.length);
  }, [articles.length]);

  const prev = useCallback(() => {
    if (articles.length < 2) return;
    setIndex((i) => (i - 1 + articles.length) % articles.length);
  }, [articles.length]);

  useEffect(() => {
    if (!activated) return undefined;

    let cancelled = false;
    const controller = new AbortController();

    const finish = (list: Article[]) => {
      if (cancelled) return;
      setIndex(0);
      if (list.length > 0) {
        setArticles(list);
        setStatus('ready');
      } else {
        setArticles([]);
        setStatus('empty');
      }
    };

    const fetchLocal = async () => {
      try {
        const locRes = await fetch(API_ROUTES.USER_LOCATION.GET, {
          signal: controller.signal,
        });
        if (!locRes.ok) {
          finish([]);
          return;
        }
        const loc = await locRes.json();
        if (!loc?.country) {
          finish([]);
          return;
        }

        const country = (countries as { name: string; code: string }[]).find(
          (c) =>
            c.code.toLowerCase() === loc.country.toLowerCase() ||
            c.name.toLowerCase() === loc.country.toLowerCase()
        );

        const fetchBy = async (param: string, value: string) => {
          const res = await fetch(
            `${API_ROUTES.ARTICLE.FILTER}?${param}=${encodeURIComponent(value)}`,
            { signal: controller.signal },
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

        finish(arts);
      } catch (error) {
        if ((error as Error).name === 'AbortError') {
          return;
        }
        finish([]);
      }
    };

    fetchLocal();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [activated]);

  useEffect(() => {
    if (!activated || articles.length < 2 || isHovered) return;
    const t = setInterval(next, ROTATE_MS);
    return () => clearInterval(t);
  }, [activated, articles.length, isHovered, next]);

  const hasArticles = status === 'ready' && articles.length > 0;

  const current = hasArticles ? articles[index] : undefined;

  return (
    <section
      ref={sectionRef}
      className={styles.container}
      aria-label="Local news"
      aria-live="polite"
      aria-busy={activated && status === 'loading'}
    >
      <h2 className={styles.heading}>Local News based on your location</h2>
      <div
        className={styles.viewport}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {hasArticles && current ? (
          <div className={styles.slider}>
            {articles.length > 1 && (
              <>
                <button
                  className={`${styles.arrow} ${styles.left}`}
                  onClick={prev}
                  aria-label="Previous article"
                  type="button"
                >
                  <svg
                    viewBox="0 0 32 32"
                    width="32"
                    height="32"
                    xmlns="http://www.w3.org/2000/svg"
                    aria-hidden="true"
                    focusable="false"
                    fill="#000000"
                  >
                    <g fill="#000000">
                      <path
                        d="M281,1106 L270.414,1106 L274.536,1110.12 C274.926,1110.51 274.926,1111.15 274.536,1111.54 C274.145,1111.93 273.512,1111.93 273.121,1111.54 L267.464,1105.88 C267.225,1105.64 267.15,1105.31 267.205,1105 C267.15,1104.69 267.225,1104.36 267.464,1104.12 L273.121,1098.46 C273.512,1098.07 274.145,1098.07 274.536,1098.46 C274.926,1098.86 274.926,1099.49 274.536,1099.88 L270.414,1104 L281,1104 C281.552,1104 282,1104.45 282,1105 C282,1105.55 281.552,1106 281,1106 L281,1106 Z M274,1089 C265.164,1089 258,1096.16 258,1105 C258,1113.84 265.164,1121 274,1121 C282.836,1121 290,1113.84 290,1105 C290,1096.16 282.836,1089 274,1089 L274,1089 Z"
                        transform="translate(-258 -1089)"
                      />
                    </g>
                  </svg>
                </button>
                <button
                  className={`${styles.arrow} ${styles.right}`}
                  onClick={next}
                  aria-label="Next article"
                  type="button"
                >
                  <svg
                    viewBox="0 0 32 32"
                    width="32"
                    height="32"
                    xmlns="http://www.w3.org/2000/svg"
                    aria-hidden="true"
                    focusable="false"
                    fill="#000000"
                  >
                    <g fill="#000000">
                      <path
                        d="M332.535,1105.88 L326.879,1111.54 C326.488,1111.93 325.855,1111.93 325.465,1111.54 C325.074,1111.15 325.074,1110.51 325.465,1110.12 L329.586,1106 L319,1106 C318.447,1106 318,1105.55 318,1105 C318,1104.45 318.447,1104 319,1104 L329.586,1104 L325.465,1099.88 C325.074,1099.49 325.074,1098.86 325.465,1098.46 C325.855,1098.07 326.488,1098.07 326.879,1098.46 L332.535,1104.12 C332.775,1104.36 332.85,1104.69 332.795,1105 C332.85,1105.31 332.775,1105.64 332.535,1105.88 L332.535,1105.88 Z M326,1089 C317.163,1089 310,1096.16 310,1105 C310,1113.84 317.163,1121 326,1121 C334.837,1121 342,1113.84 342,1105 C342,1096.16 334.837,1089 326,1089 L326,1089 Z"
                        transform="translate(-310 -1089)"
                      />
                    </g>
                  </svg>
                </button>
              </>
            )}
            <ArticleCard key={current.id} article={current} />
          </div>
        ) : status === 'loading' ? (
          <div className={styles.skeleton} aria-hidden="true">
            <span className={styles.skeletonTitle} />
            <span className={styles.skeletonLine} />
            <span className={`${styles.skeletonLine} ${styles.skeletonLineShort}`} />
            <span className={styles.skeletonMeta} />
          </div>
        ) : (
          <div className={styles.emptyState} role="status">
            Local headlines will appear here once we detect your region.
          </div>
        )}
      </div>
    </section>
  );
}
