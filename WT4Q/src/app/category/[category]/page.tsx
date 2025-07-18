import ArticleCard, { Article } from '@/components/ArticleCard';
import { API_ROUTES } from '@/lib/api';
import styles from '../category.module.css';

async function fetchArticles(cat: string): Promise<Article[]> {
  try {
    const res = await fetch(
      `${API_ROUTES.ARTICLE.SEARCH_ADVANCED}?category=${encodeURIComponent(cat)}`,
      { cache: 'no-store' }
    );
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default async function CategoryPage({ params }: any) {
  const articles = await fetchArticles(params.category);
  return (
    <div className={styles.container}>
      <h1 className={styles.title}>{params.category}</h1>
      <div className={styles.grid}>
        {articles.map((a) => (
          <ArticleCard key={a.id} article={a} />
        ))}
      </div>
    </div>
  );
}
