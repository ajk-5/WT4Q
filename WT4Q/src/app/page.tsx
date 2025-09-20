// app/page.tsx
import { Suspense } from 'react';
import ArticleCard, { Article } from '@/components/ArticleCard';
import BreakingCenterpiece from '@/components/BreakingCenterpiece';
import TrendingCenterpiece from '@/components/TrendingCenterpiece';
import type { BreakingArticle } from '@/components/BreakingNewsSlider';
import type { TrendingArticle } from '@/components/TrendingNewsSlider';
import PrefetchLink from '@/components/PrefetchLink';
import type { ArticleImage } from '@/lib/models';
import { API_ROUTES } from '@/lib/api';
import { CATEGORIES } from '@/lib/categories';
import { chunk } from '@/lib/chunk';
import { getArticlesByCategory } from '@/lib/server/articles';
import type { Metadata } from 'next';
import styles from './page.module.css';
import LocalArticleSection from '@/components/LocalArticleSection';

export const revalidate = 180; // ISR: cache homepage for 3 minutes

export const metadata: Metadata = {
  title: 'The Nineties Times: Independent, Reliable News (90sTimes)',
  description:
    'Independent, trustworthy coverage from The Nineties Times (90sTimes). We report with accuracy and respect-without favoritism toward any party or group.',
  keywords: [
    'The Nineties Times',
    '90sTimes',
    '90stimes',
    '90s Times',
    'The Nineties',
    'independent media',
    'reliable news',
  ],
  alternates: { canonical: '/' },
  openGraph: {
    title: 'The Nineties Times - independent, reliable news (90sTimes)',
    description:
      'Impartial coverage across politics, culture, lifestyle and more. No favoritism toward any party or community.',
    url: '/',
    type: 'website',
  },
};

type CategorySummary = {
  category: string;
  articles: Article[];
};

type CategoriesPromise = Promise<CategorySummary[]>;

function loadAllCategories(): CategoriesPromise {
  return Promise.all(
    CATEGORIES.map(async (category) => ({
      category,
      articles: await fetchArticlesByCategory(category),
    })),
  );
}

export default async function Home() {
  const categoriesPromise = loadAllCategories();
  const breakingPromise = fetchBreakingNews();
  const trendingPromise = fetchTrendingNews();

  const [breaking, trendingArticles] = await Promise.all([
    breakingPromise,
    trendingPromise,
  ]);

  return (
    <div className={styles.newspaper}>
      <div className={styles.frontPageGrid}>
        <Suspense fallback={<CategorySectionSkeleton />}>
          <RailSection categoriesPromise={categoriesPromise} nonEmptyIndex={0} />
        </Suspense>

        <div className={styles.centerColumn}>
          <BreakingCenterpiece articles={breaking} />
        </div>

        <Suspense fallback={<CategorySectionSkeleton />}>
          <RailSection categoriesPromise={categoriesPromise} nonEmptyIndex={2} />
        </Suspense>

        <Suspense fallback={<CategorySectionSkeleton />}>
          <RailSection categoriesPromise={categoriesPromise} nonEmptyIndex={1} />
        </Suspense>

        <div className={styles.centerColumn}>
          <TrendingCenterpiece articles={trendingArticles} />
        </div>

        <Suspense fallback={<CategorySectionSkeleton />}>
          <RailSection categoriesPromise={categoriesPromise} nonEmptyIndex={3} />
        </Suspense>
      </div>

      <Suspense fallback={<CategoryRowsSkeleton />}>
        <RemainingCategoryRows categoriesPromise={categoriesPromise} />
      </Suspense>

      <LocalArticleSection />
    </div>
  );
}

async function fetchArticlesByCategory(cat: string): Promise<Article[]> {
  try {
    return await getArticlesByCategory(cat, { limit: 12 });
  } catch {
    return [];
  }
}

async function fetchBreakingNews(): Promise<BreakingArticle[]> {
  try {
    const res = await fetch(API_ROUTES.ARTICLE.BREAKING, { next: { revalidate: 120 } });
    if (!res.ok) return [];
    const data = (await res.json()) as BreakingArticle[];
    return (data || [])
      .sort(
        (a, b) =>
          new Date(b.createdDate ?? 0).getTime() -
          new Date(a.createdDate ?? 0).getTime(),
      )
      .map((a) => ({
        id: a.id,
        slug: a.slug,
        title: a.title,
        content: a.content,
        images: a.images as ArticleImage[],
      }));
  } catch {
    return [];
  }
}

async function fetchTrendingNews(limit = 5): Promise<TrendingArticle[]> {
  try {
    const res = await fetch(API_ROUTES.ARTICLE.TRENDING(limit), { next: { revalidate: 120 } });
    if (!res.ok) return [];
    const data = (await res.json()) as Article[];
    return data.map((a) => ({
      id: a.id,
      slug: a.slug,
      title: a.title,
      content: a.content,
      images: a.images as ArticleImage[],
    }));
  } catch {
    return [];
  }
}

async function RailSection({
  categoriesPromise,
  nonEmptyIndex,
}: {
  categoriesPromise: CategoriesPromise;
  nonEmptyIndex: number;
}) {
  const categories = await categoriesPromise;
  const nonEmpty = categories.filter((c) => c.articles && c.articles.length > 0);
  const entry = nonEmpty[nonEmptyIndex];

  if (!entry) {
    return <div className={styles.sectionPlaceholder} aria-hidden />;
  }

  return <CategorySection category={entry.category} articles={entry.articles} />;
}

async function RemainingCategoryRows({
  categoriesPromise,
}: {
  categoriesPromise: CategoriesPromise;
}) {
  const categories = await categoriesPromise;
  const nonEmpty = categories.filter((c) => c.articles && c.articles.length > 0);
  const remaining = nonEmpty.slice(4);
  if (remaining.length === 0) {
    return null;
  }

  const remainingRows = chunk(remaining, 3);

  return (
    <>
      {remainingRows.map((row, i) => (
        <div key={`row-${i}`} className={styles.row}>
          {row.map(({ category, articles }) => (
            <CategorySection
              key={category}
              category={category}
              articles={articles}
              className={styles.column}
            />
          ))}
        </div>
      ))}
    </>
  );
}

function CategorySection({
  category,
  articles,
  className,
}: {
  category: string;
  articles: Article[];
  className?: string;
}) {
  return (
    <section className={`${styles.section}${className ? ` ${className}` : ''}`}>
      <h2 className={styles.heading}>
        <PrefetchLink
          href={`/category/${encodeURIComponent(category)}`}
          className={styles.kicker}
        >
          {category}
        </PrefetchLink>
      </h2>
      <div className={styles.columnGrid}>
        {articles.slice(0, 3).map((a) => (
          <ArticleCard key={a.id} article={a} />
        ))}
      </div>
    </section>
  );
}

function CategorySectionSkeleton({ className }: { className?: string }) {
  const classes = [styles.section, styles.sectionSkeleton];
  if (className) classes.push(className);

  return (
    <section className={classes.join(' ')} aria-hidden="true">
      <span className={styles.skeletonHeading} />
      <div className={styles.skeletonCard}>
        <span className={styles.skeletonTitle} />
        <span className={styles.skeletonLine} />
        <span className={styles.skeletonMeta} />
      </div>
      <div className={styles.skeletonCard}>
        <span className={styles.skeletonTitle} />
        <span className={styles.skeletonLine} />
        <span className={styles.skeletonMeta} />
      </div>
      <div className={styles.skeletonCard}>
        <span className={styles.skeletonTitleShort} />
        <span className={styles.skeletonLineShort} />
      </div>
    </section>
  );
}

function CategoryRowsSkeleton() {
  const rowCount = Math.max(1, Math.ceil((CATEGORIES.length - 4) / 3));

  return (
    <>
      {Array.from({ length: rowCount }).map((_, rowIndex) => (
        <div key={`skeleton-row-${rowIndex}`} className={styles.row} aria-hidden="true">
          {Array.from({ length: 3 }).map((_, colIndex) => (
            <CategorySectionSkeleton key={`skeleton-${rowIndex}-${colIndex}`} className={styles.column} />
          ))}
        </div>
      ))}
    </>
  );
}
