import ArticleCard, { Article } from '@/components/ArticleCard';
import { API_ROUTES } from '@/lib/api';
import styles from '../article.module.css';

interface ArticleDetails {
  id: string;
  title: string;
  description: string;
  createdDate: string;
}

async function fetchArticle(id: string): Promise<ArticleDetails | null> {
  try {
    const res = await fetch(API_ROUTES.ARTICLE.GET_BY_ID(id), { cache: 'no-store' });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

async function fetchRelated(id: string): Promise<Article[]> {
  try {
    const res = await fetch(API_ROUTES.ARTICLE.GET_RECOMMENDATIONS(id), { cache: 'no-store' });
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

export default async function ArticlePage({ params }: { params: { id: string } }) {
  const { id } = params;
  const article = await fetchArticle(id);
  if (!article) {
    return <div className={styles.container}>Article not found.</div>;
  }
  const related = await fetchRelated(id);
  return (
    <div className={styles.container}>
      <h1 className={styles.title}>{article.title}</h1>
      <p className={styles.meta}>{new Date(article.createdDate).toLocaleDateString()}</p>
      <p className={styles.content}>{article.description}</p>
      {related.length > 0 && (
        <section>
          <h2 className={styles.relatedHeading}>Related Articles</h2>
          <div className={styles.grid}>
            {related.map((a) => (
              <ArticleCard key={a.id} article={a} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
