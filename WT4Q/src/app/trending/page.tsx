import ArticleCard, { Article } from '@/components/ArticleCard';
import { API_ROUTES } from '@/lib/api';
import type { Metadata } from 'next';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: 'Trending News',
  alternates: { canonical: '/trending' },
};

async function fetchTrending(): Promise<Article[]> {
  try {
    const res = await fetch(API_ROUTES.ARTICLE.TRENDING(10), { cache: 'no-store' });
    if (!res.ok) return [];
    return (await res.json()) as Article[];
  } catch {
    return [];
  }
}

export default async function TrendingPage() {
  const articles = await fetchTrending();
  return (
    <div className={styles.container}>
      <h1 className={styles.heading}>Top 10 Trending News</h1>
      <ol className={styles.list}>
        {articles.map((a, i) => (
          <li key={a.id} className={styles.item}>
            <span className={styles.rank}>{`#${i + 1}`}</span>
            <ArticleCard article={a} />
          </li>
        ))}
      </ol>
    </div>
  );
}
