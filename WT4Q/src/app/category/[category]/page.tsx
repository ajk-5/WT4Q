import ArticleCard, { Article } from '@/components/ArticleCard';
import { API_ROUTES } from '@/lib/api';
import type { Metadata } from 'next';
import styles from '../category.module.css';
import LocalArticleSection from '@/components/LocalArticleSection';

async function fetchArticles(cat: string): Promise<Article[]> {
  try {
    const res = await fetch(
      `${API_ROUTES.ARTICLE.SEARCH_ADVANCED}?category=${encodeURIComponent(cat)}`,
      { cache: 'no-store' }
    );
    if (!res.ok) return [];
    const data: Article[] = await res.json();
    return data.sort(
      (a, b) =>
        new Date(b.createdDate ?? 0).getTime() -
        new Date(a.createdDate ?? 0).getTime(),
    );
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: { params: Promise<{ category: string }> }): Promise<Metadata> {
  const { category } = await params;
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL || 'https://www.wt4q.com';
  const url = `${siteUrl}/category/${encodeURIComponent(category)}`;
  const title = `${category} - WT4Q`;
  return {
    title,
    alternates: { canonical: url },
    openGraph: {
      title,
      url,
      type: 'website',
    },
  };
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = await params;
  const articles = await fetchArticles(category);
  return (
    <div className={styles.container}>

      <h1 className={styles.title}>{category}</h1>
      <div className={styles.grid}>
        {articles.map((a) => (
          <ArticleCard key={a.id} article={a} />
        ))}
      </div>
            <LocalArticleSection />
    </div>
  );
}
