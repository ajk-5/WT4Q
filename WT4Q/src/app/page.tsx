// app/page.tsx
import ArticleCard, { Article } from '@/components/ArticleCard';
import BreakingCenterpiece from '@/components/BreakingCenterpiece';
import type { BreakingArticle } from '@/components/BreakingNewsSlider';
import type { ArticleImage } from '@/lib/models';
import { API_ROUTES } from '@/lib/api';
import { CATEGORIES } from '@/lib/categories';
import type { Metadata } from 'next';
import styles from './page.module.css';
import WeatherWidget from '@/components/WeatherWidget';

export const metadata: Metadata = {
  title: 'Home',
  alternates: { canonical: '/' },
  openGraph: { title: 'WT4Q News', url: '/', type: 'website' },
};

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

async function fetchBreakingNews(): Promise<BreakingArticle[]> {
  try {
    const res = await fetch(API_ROUTES.ARTICLE.BREAKING, { cache: 'no-store' });
    if (!res.ok) return [];
    const data = await res.json();
    return (data || []).map((a: any) => ({
      id: a.id,
      title: a.title,
      content: a.content,
      images: a.images as ArticleImage[],
    }));
  } catch {
    return [];
  }
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

export default async function Home() {
  const categoriesWithArticles = await Promise.all(
    CATEGORIES.map(async (c) => ({
      category: c,
      articles: await fetchArticlesByCategory(c),
    }))
  );
  const breaking = await fetchBreakingNews();

  // Take the first 4 categories for the rails around the centerpiece
  const leftRail = categoriesWithArticles.slice(0, 2);
  const rightRail = categoriesWithArticles.slice(2, 4);
  const remaining = categoriesWithArticles.slice(4);
  const remainingRows = chunk(remaining, 3);

  const dateline = new Date().toLocaleDateString('en-GB', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className={styles.newspaper}>
      {/* Masthead */}
      <header className={styles.masthead} aria-label="Site masthead">
        <div className={styles.mastheadInner}>
          <div className={styles.brandBlock}>
            <h1 className={styles.brand}>WT4Q NEWS</h1>
            <p className={styles.tagline}>All the News That Matters</p>
          </div>
          <div className={styles.dateline}>{dateline}</div>
          <div className={styles.weather}>
            <WeatherWidget />
          </div>
        </div>
      </header>

      <div className={styles.ruleThick} aria-hidden="true" />
      <div className={styles.ruleThin} aria-hidden="true" />


      {/* Front page grid: Left sections | BIG BREAKING BOX | Right sections */}
      <div className={styles.frontPageGrid}>
        <div className={`${styles.rail} ${styles.leftRail}`}>
          {leftRail.map(({ category, articles }) => (
            <section key={category} className={styles.section}>
              <h2 className={styles.heading}>
                <span className={styles.kicker}>{category}</span>
              </h2>
              <div className={styles.columnGrid}>
                {articles.slice(0, 5).map((a) => (
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
                <span className={styles.kicker}>{category}</span>
              </h2>
              <div className={styles.columnGrid}>
                {articles.slice(0, 5).map((a) => (
                  <ArticleCard key={a.id} article={a} />
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>

      {/* The rest of the sections in rows (keeps vertical barres) */}
      {remainingRows.map((row, i) => (
        <div key={`row-${i}`} className={styles.row}>
          {row.map(({ category, articles }) => (
            <section key={category} className={`${styles.section} ${styles.column}`}>
              <h2 className={styles.heading}>
                <span className={styles.kicker}>{category}</span>
              </h2>
              <div className={styles.columnGrid}>
                {articles.slice(0, 5).map((a) => (
                  <ArticleCard key={a.id} article={a} />
                ))}
              </div>
            </section>
          ))}
        </div>
      ))}

     {/* <div className={`${styles.ruleThin} ${styles.mtLg}`} aria-hidden="true" />
      <footer className={styles.footer}>
        <nav className={styles.footerNav}>
          {CATEGORIES.map((c) => (
            <PrefetchLink key={c} href={`/category/${encodeURIComponent(c)}`} className={styles.footerLink}>
              {c}
            </PrefetchLink>
          ))}
        </nav>
      </footer>*/}
    </div>
  );
}
