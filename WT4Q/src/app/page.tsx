import ArticleCard, { Article } from '@/components/ArticleCard';
import { API_ROUTES } from '@/lib/api';
import styles from './page.module.css';

async function fetchArticles(): Promise<Article[]> {
  try {
    const res = await fetch(API_ROUTES.ARTICLE.GET_ALL, { cache: 'no-store' });
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

export default async function Home() {
  const articles = await fetchArticles();
  return (
    <div className={styles.container}>
      {articles.map((a) => (
        <ArticleCard key={a.id} article={a} />
      ))}
    </div>
  );
}
