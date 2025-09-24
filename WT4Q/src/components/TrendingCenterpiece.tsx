'use client';

import TrendingNewsSlider, { TrendingArticle } from './TrendingNewsSlider';
import PrefetchLink from '@/components/PrefetchLink';
import styles from './BreakingCenterpiece.module.css';

export default function TrendingCenterpiece({
  articles,
}: {
  articles: TrendingArticle[];
}) {
  return (
    <section className={styles.centerpiece} aria-label="Trending News">
      <div className={styles.header}>
        <PrefetchLink href="/trending" className={styles.badge}>
          Trending News
        </PrefetchLink>
      </div>

      <TrendingNewsSlider
        articles={articles && articles.length > 0 ? articles : undefined}
        className={styles.slider}
        showDetails
      />
    </section>
  );
}
