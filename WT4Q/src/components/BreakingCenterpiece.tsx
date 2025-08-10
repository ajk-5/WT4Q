'use client';

import BreakingNewsSlider, { BreakingArticle } from './BreakingNewsSlider';
import styles from './BreakingCenterpiece.module.css';

export default function BreakingCenterpiece({
  articles,
  label = 'Breaking News',
}: {
  articles: BreakingArticle[];
  label?: string;
}) {
  if (!articles || articles.length === 0) return null;

  return (
    <section className={styles.centerpiece} aria-label={label}>
      <div className={styles.header}>
        <span className={styles.badge}>{label}</span>
      </div>

      {/* Reuse your dynamic slider inside the big box */}
      <BreakingNewsSlider articles={articles} className={styles.slider} />
    </section>
  );
}