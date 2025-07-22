import ArticleCard, { Article } from '@/components/ArticleCard';
import AgeGate from '@/components/AgeGate';
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

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = await params;
  const articles = await fetchArticles(category);
  const content = (
    <div className={styles.container}>
      <h1 className={styles.title}>{category}</h1>
      <div className={styles.grid}>
        {articles.map((a) => (
          <ArticleCard key={a.id} article={a} />
        ))}
      </div>
    </div>
  );

  if (category.toLowerCase() === 'adult') {
    return <AgeGate storageKey="adultVerified">{content}</AgeGate>;
  }

  return content;
}
