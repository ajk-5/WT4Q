import Script from 'next/script';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
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
import {
  CATEGORIES,
  getCategoryDetails,
  normalizeCategoryName,
} from '@/lib/categories';

const CATEGORY_FETCH_LIMIT = 60;

export const revalidate = 180;
export const dynamicParams = false;

export function generateStaticParams() {
  return CATEGORIES.map((category) => ({ category }));
}

async function fetchArticles(cat: string): Promise<Article[]> {
  try {
    const url = new URL(API_ROUTES.ARTICLE.SEARCH_ADVANCED);
    url.searchParams.set('category', cat);
    url.searchParams.set('limit', String(CATEGORY_FETCH_LIMIT));
    const res = await fetch(url, { next: { revalidate: 180 } });
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

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string }>;
}): Promise<Metadata> {
  const { category: rawCategory } = await params;
  const normalized = normalizeCategoryName(rawCategory);
  if (!normalized) {
    return {
      title: 'Category - The Nineties Times',
    };
  }
  const { description, keywords } = getCategoryDetails(normalized);
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL || 'https://www.90stimes.com';
  const url = `${siteUrl}/category/${encodeURIComponent(normalized)}`;
  const title = `${normalized} News & Analysis - The Nineties Times`;
  return {
    title,
    description,
    keywords,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
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
  const { category: rawCategory } = await params;
  const normalized = normalizeCategoryName(rawCategory);
  if (!normalized) {
    notFound();
  }
  const { description } = getCategoryDetails(normalized);
  const articles = await fetchArticles(normalized);

  const today = new Date();

  const grouped = groupByDate(articles);
  const todayKey = today.toDateString();
  const todayArticles = grouped[todayKey] || [];
  delete grouped[todayKey];
  const pastDates = Object.keys(grouped).sort(
    (a, b) => new Date(b).getTime() - new Date(a).getTime(),
  );

  const breakingInCategory: BreakingArticle[] = toBreakingArticles(
    (todayArticles.length > 0 ? todayArticles : articles).slice(0, 10),
  );

  const trendingInCategory: TrendingArticle[] = toTrendingArticles(
    [...articles]
      .sort(
        (a, b) =>
          (b.views ?? 0) - (a.views ?? 0) ||
          new Date(b.createdDate ?? 0).getTime() -
            new Date(a.createdDate ?? 0).getTime(),
      )
      .slice(0, 10),
  );

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL || 'https://www.90stimes.com';
  const canonicalUrl = new URL(
    `/category/${encodeURIComponent(normalized)}`,
    siteUrl,
  ).toString();
  const itemListElement = articles.slice(0, 10).map((article, index) => ({
    '@type': 'ListItem',
    position: index + 1,
    url: new URL(`/articles/${article.slug}`, siteUrl).toString(),
    name: article.title,
  }));
  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: `${normalized} news from The Nineties Times`,
      description,
      inLanguage: 'en-US',
      isPartOf: siteUrl,
      url: canonicalUrl,
    },
  ];
  if (itemListElement.length > 0) {
    jsonLd.push({
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: `${normalized} headlines`,
      itemListOrder: 'https://schema.org/ItemListOrderDescending',
      url: canonicalUrl,
      itemListElement,
    });
  }

  return (
    <div className={baseStyles.newspaper}>
      <Script
        id={`ld-category-${normalized.toLowerCase().replace(/\s+/g, '-')}`}
        type="application/ld+json"
        strategy="afterInteractive"
      >
        {JSON.stringify(jsonLd)}
      </Script>
      <h1 className={baseStyles.brand}>
        <span className={styles.categoryLabel}>{normalized}</span>
      </h1>
      <p className={styles.categoryDescription}>{description}</p>
      <div className={baseStyles.ruleThick} aria-hidden="true" />
      <div className={baseStyles.ruleThin} aria-hidden="true" />

      {breakingInCategory.length > 0 && (
        <div className={baseStyles.centerColumn}>
          <BreakingCenterpiece articles={breakingInCategory} />
        </div>
      )}
      {todayArticles.length > 0 && (
        <section>
          <h2 className={styles.sectionHeading}>Today&apos;s News</h2>
          <HorizontalScroller
            className={styles.horizontalCards}
            ariaLabel="Today's news scroller"
          >
            {todayArticles.map((a) => (
              <CategoryArticleCard key={a.id} article={a} />
            ))}
          </HorizontalScroller>
        </section>
      )}

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
