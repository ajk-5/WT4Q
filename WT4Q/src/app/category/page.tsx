import type { Metadata } from 'next';
import ArticleCard, { Article } from '@/components/ArticleCard';
import PrefetchLink from '@/components/PrefetchLink';
import { API_ROUTES } from '@/lib/api';
import { CATEGORY_DEFINITIONS } from '@/lib/categories';
import styles from './category.module.css';

export const revalidate = 180;

export const metadata: Metadata = {
  title: 'Time Capsule | The Nineties Times',
  description:
    'Browse Time Capsule channels and catch the latest Blast from the Past throwback.',
  alternates: { canonical: '/category' },
};

type PagedResult<T> = { items?: T[] };

async function fetchBlastFromPast(): Promise<Article[]> {
  try {
    const params = new URLSearchParams({
      page: '1',
      pageSize: '8',
      sort: 'date_desc',
      type: 'Article',
      category: 'Info',
      keyword: 'blast-from-the-past',
    });

    const res = await fetch(API_ROUTES.ARTICLE.SEARCH_PAGED(params.toString()), {
      next: { revalidate: 180 },
    });
    if (!res.ok) return [];
    const data = (await res.json()) as PagedResult<Article>;
    return Array.isArray(data.items) ? data.items : [];
  } catch {
    return [];
  }
}

export default async function TimeCapsulePage() {
  const blastArticles = await fetchBlastFromPast();

  return (
    <div className={styles.container}>
      <header className={styles.hero}>
        <span className={styles.kicker}>Time capsule</span>
        <h1 className={styles.title}>Time Capsule</h1>
        <p className={styles.subtitle}>
          Pick a channel, then jump into the daily &quot;Blast from the Past&quot; feature.
        </p>
      </header>

      <section id="blast-from-the-past" className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Blast from the Past</h2>
          <p className={styles.sectionDesc}>One iconic 90s moment at a time.</p>
        </div>

        <div className={styles.articleGrid}>
          {blastArticles.length === 0 ? (
            <div className={styles.empty}>
              The time machine is booting up. Check back soon for the next feature.
            </div>
          ) : (
            blastArticles.map((article) => <ArticleCard key={article.id} article={article} />)
          )}
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Channels</h2>
          <p className={styles.sectionDesc}>Browse the archive lanes of the decade.</p>
        </div>

      <div className={styles.grid}>
        {CATEGORY_DEFINITIONS.map((c) => (
          <PrefetchLink
            key={c.key}
            href={`/category/${encodeURIComponent(c.key)}`}
            className={styles.categoryLink}
          >
            <span className={styles.categoryName}>{c.label}</span>
            <span className={styles.categoryDescription}>{c.description}</span>
          </PrefetchLink>
        ))}
      </div>
      </section>
    </div>
  );
}
