// app/page.tsx
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
import type { Metadata } from 'next';
import styles from './page.module.css';
import WeatherWidget from '@/components/WeatherWidget';
import LocalArticleSection from '@/components/LocalArticleSection';

export const metadata: Metadata = {
  title: 'The Nineties Times: Reliable, Exclusive News Website',
  alternates: { canonical: '/' },
  openGraph: { title: 'The Nineties Times: website for News, Articles, Informations, Politics ,Crime,lifestyle and luxury', url: '/', type: 'website' },
};

async function fetchArticlesByCategory(cat: string): Promise<Article[]> {
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

async function fetchBreakingNews(): Promise<BreakingArticle[]> {
  try {
    const res = await fetch(API_ROUTES.ARTICLE.BREAKING, { cache: 'no-store' });
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
    const res = await fetch(API_ROUTES.ARTICLE.TRENDING(limit), { cache: 'no-store' });
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

export default async function Home() {
  const categoriesWithArticles = await Promise.all(
    CATEGORIES.map(async (c) => ({
      category: c,
      articles: await fetchArticlesByCategory(c),
    }))
  );
  const breaking = await fetchBreakingNews();
  const trendingArticles = await fetchTrendingNews();

  // Take the first 4 categories for the rails around the centerpiece
  const leftRail = categoriesWithArticles.slice(0, 1);
  const rightRail = categoriesWithArticles.slice(1,2);
  const remaining = categoriesWithArticles.slice(2,9);
  const remainingRows = chunk(remaining, 7);

  const dateline = new Date().toLocaleDateString('en-GB', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className={styles.newspaper}>
      {/* Masthead */}
      {/*<header className={styles.masthead} aria-label="Site masthead">
        <div className={styles.mastheadInner}>
          <div className={styles.brandBlock}>
            <h1 className={styles.brand}>The Nineties Times</h1>
            <p className={styles.tagline}>All the News That Matters</p>
          </div>

        </div>
      </header>*/}
      {/* Front page grid: Left sections | BIG BREAKING BOX | Right sections */}


      {/* Front page grid: Left sections | BIG BREAKING BOX | Right sections */}
      <div className={styles.frontPageGrid}>
               
        <div className={`${styles.rail} ${styles.leftRail}`}>
          {leftRail.map(({ category, articles }) => (
            <section key={category} className={styles.section}>
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
          ))}
        </div>

 <div className={styles.centerColumn}>
          <BreakingCenterpiece articles={breaking} />
        </div>

        <div className={`${styles.rail} ${styles.rightRail}`}>
          {rightRail.map(({ category, articles }) => (
            <section key={category} className={styles.section}>
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
          ))}
        </div>
      </div>
        <div className={styles.centerColumn}>
          <TrendingCenterpiece articles={trendingArticles} />
        </div>
      {/* The rest of the sections in rows (keeps vertical barres) */}
      {remainingRows.map((row, i) => (
        <div key={`row-${i}`} className={styles.row}>
          {row.map(({ category, articles }) => (
            <section key={category} className={`${styles.section} ${styles.column}`}>
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
          ))}
        </div>
      ))}

      <LocalArticleSection />

      {/* Footer section temporarily removed */}
    </div>
  );
}
