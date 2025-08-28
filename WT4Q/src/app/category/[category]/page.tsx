import type { Metadata } from 'next';
import WeatherWidget from '@/components/WeatherWidget';
import { API_ROUTES } from '@/lib/api';
import type { Article } from '@/components/ArticleCard';
import CategoryArticleCard from '@/components/CategoryArticleCard';
import baseStyles from '../../page.module.css';
import styles from './categoryPage.module.css';
import BreakingCenterpiece from '@/components/BreakingCenterpiece';
import TrendingCenterpiece from '@/components/TrendingCenterpiece';
import type { BreakingArticle } from '@/components/BreakingNewsSlider';
import type { TrendingArticle } from '@/components/TrendingNewsSlider';
import HorizontalScroller from '@/components/HorizontalScroller';
import CategoryLazyDates from '@/components/CategoryLazyDates';

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

function toBreakingArticles(list: Article[]): BreakingArticle[] {
  return list.map((a) => ({
    id: a.id,
    slug: a.slug,
    title: a.title,
    content: a.content,
    images: a.images,
    createdDate: a.createdDate,
  }));
}

function toTrendingArticles(list: Article[]): TrendingArticle[] {
  return list.map((a, i) => ({
    id: a.id,
    slug: a.slug,
    title: a.title,
    content: a.content,
    images: a.images,
    createdDate: a.createdDate,
    rank: i + 1,
  }));
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

  // Build category-scoped breaking and trending sections
  const breakingInCategory: BreakingArticle[] = toBreakingArticles(
    // Prefer today's posts; fall back to most recent overall
    (todayArticles.length > 0 ? todayArticles : articles).slice(0, 10)
  );

  const trendingInCategory: TrendingArticle[] = toTrendingArticles(
    [...articles]
      .sort((a, b) => (b.views ?? 0) - (a.views ?? 0) ||
        new Date(b.createdDate ?? 0).getTime() - new Date(a.createdDate ?? 0).getTime())
      .slice(0, 10)
  );

  return (
    <div className={baseStyles.newspaper}>
      <header className={baseStyles.masthead} aria-label="Site masthead">
        <div className={baseStyles.mastheadInner}>
          <div className={baseStyles.brandBlock}>
            <h1 className={baseStyles.brand}>
              WT4Q <span className={styles.categoryLabel}> {category}</span>
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

{/* Category-specific breaking centerpiece between today's and the rest */}
      {breakingInCategory.length > 0 && (
        <div className={baseStyles.centerColumn}>
          <BreakingCenterpiece articles={breakingInCategory} />
        </div>
      )}
      {todayArticles.length > 0 && (
        <section>
          <h2 className={styles.sectionHeading}>Today&apos;s News</h2>
          <HorizontalScroller className={styles.horizontalCards} ariaLabel="Today's news scroller">
            {todayArticles.map((a) => (
              <CategoryArticleCard key={a.id} article={a} />
            ))}
          </HorizontalScroller>
        </section>
      )}

      

      {/* Category-specific trending centerpiece */}
      {trendingInCategory.length > 0 && (
        <div className={baseStyles.centerColumn}>
          <TrendingCenterpiece articles={trendingInCategory} />
        </div>
      )}

      <CategoryLazyDates
        pastDates={pastDates}
        grouped={grouped}
        sectionClassName={styles.dateSection}
        dateHeadingClassName={styles.dateHeading}
        horizontalCardsClassName={styles.horizontalCards}
      />
    </div>
  );
}
