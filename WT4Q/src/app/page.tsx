import ArticleCard, { Article } from '@/components/ArticleCard';
import Hero from '@/components/Hero';
import { API_ROUTES } from '@/lib/api';
import { CATEGORIES } from '@/lib/categories';
import styles from './page.module.css';

async function fetchArticlesByCategory(cat: string): Promise<Article[]> {
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

export default async function Home() {
  const categoriesWithArticles = await Promise.all(
    CATEGORIES.map(async (c) => ({
      category: c,
      articles: await fetchArticlesByCategory(c),
    }))
  );
  return (
    <>
      <Hero />
      {categoriesWithArticles.map(({ category, articles }) => (
        <section key={category} className={styles.section}>
          <h2 className={styles.heading}>{category}</h2>
          <div className={styles.grid}>
            {articles.slice(0, 5).map((a) => (
              <ArticleCard key={a.id} article={a} />
            ))}
          </div>
        </section>
      ))}
    </>
  );
}
