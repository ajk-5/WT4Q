import type { Metadata } from 'next';
import WeatherWidget from '@/components/WeatherWidget';
import { API_ROUTES } from '@/lib/api';
import type { Article } from '@/components/ArticleCard';
import CategoryArticleCard from '@/components/CategoryArticleCard';
import baseStyles from '../../page.module.css';
import styles from './categoryPage.module.css';

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
        new Date(a.createdDate ?? 0).getTime()
    );
  } catch {
    return [];
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string }>;
}): Promise<Metadata> {
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

function groupByDate(articles: Article[]): Record<string, Article[]> {
  return articles.reduce((acc, article) => {
    const d = new Date(article.createdDate ?? 0);
    const key = d.toDateString();
    (acc[key] ||= []).push(article);
    return acc;
  }, {} as Record<string, Article[]>);
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = await params;
  const articles = await fetchArticles(category);

  const today = new Date();
  const dateline = today.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  const grouped = groupByDate(articles);
  const todayKey = today.toDateString();
  const todayArticles = grouped[todayKey] || [];
  delete grouped[todayKey];
  const pastDates = Object.keys(grouped).sort(
    (a, b) => new Date(b).getTime() - new Date(a).getTime()
  );

  return (
    <div className={baseStyles.newspaper}>
      <header className={baseStyles.masthead} aria-label="Site masthead">
        <div className={baseStyles.mastheadInner}>
          <div className={baseStyles.brandBlock}>
            <h1 className={baseStyles.brand}>
              WT4Q NEWS <span className={styles.categoryLabel}>| {category}</span>
            </h1>
            <p className={baseStyles.tagline}>All the News That Matters</p>
          </div>
          <div className={baseStyles.dateline}>{dateline}</div>
          <div className={baseStyles.weather}>
            <WeatherWidget />
          </div>
        </div>
      </header>
      <div className={baseStyles.ruleThick} aria-hidden="true" />
      <div className={baseStyles.ruleThin} aria-hidden="true" />

      {todayArticles.length > 0 && (
        <section>
          <h2 className={styles.sectionHeading}>Today&apos;s News</h2>
          <div className={styles.horizontalCards}>
            {todayArticles.map((a) => (
              <CategoryArticleCard key={a.id} article={a} />
            ))}
          </div>
        </section>
      )}

      {pastDates.map((dateStr) => (
        <section key={dateStr} className={styles.dateSection}>
          <h2 className={styles.dateHeading}>
            {new Date(dateStr).toLocaleDateString('en-GB', {
              weekday: 'long',
              day: '2-digit',
              month: 'long',
              year: 'numeric',
            })}
          </h2>
          <div className={styles.horizontalCards}>
            {grouped[dateStr].map((a) => (
              <CategoryArticleCard key={a.id} article={a} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
