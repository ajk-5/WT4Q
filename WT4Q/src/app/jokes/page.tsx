import type { Metadata } from 'next';
import ArticleCard, { Article } from '@/components/ArticleCard';
import { API_ROUTES } from '@/lib/api';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: 'Jokes | The Nineties Times',
  description: '90s jokes, one-liners, and throwback humor.',
  alternates: { canonical: '/jokes' },
};

type PagedResult<T> = { items?: T[] };

async function searchWith(params: URLSearchParams): Promise<Article[]> {
  try {
    const res = await fetch(API_ROUTES.ARTICLE.SEARCH_PAGED(params.toString()), {
      cache: 'no-store',
    });
    if (!res.ok) {
      return [];
    }
    const data = (await res.json()) as PagedResult<Article>;
    return Array.isArray(data.items) ? data.items : [];
  } catch {
    return [];
  }
}

async function fetchJokes(): Promise<Article[]> {
  const base = {
    page: '1',
    pageSize: '12',
    sort: 'date_desc',
    type: 'Article',
    category: 'Info',
  };

  // Broad search first: catches AI jokes even if exact keyword "jokes" is missing.
  const broad = new URLSearchParams({
    ...base,
    q: '90s jokes one-liners punchlines humor funny',
  });
  const primary = await searchWith(broad);
  if (primary.length > 0) {
    return primary;
  }

  // Fallback for older entries tagged with explicit "jokes" keyword.
  const fallback = new URLSearchParams({
    ...base,
    keyword: 'jokes',
  });
  return searchWith(fallback);
}

export default async function JokesPage() {
  const jokes = await fetchJokes();

  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <span className={styles.kicker}>Laugh track</span>
        <h1>90s Jokes &amp; One-Liners</h1>
        <p>Lightweight, playful, and made for a throwback smile.</p>
      </header>
      <section className={styles.grid}>
        {jokes.length === 0 ? (
          <div className={styles.empty}>
            Jokes are on the way. Check back soon for new one-liners.
          </div>
        ) : (
          jokes.map((joke) => <ArticleCard key={joke.id} article={joke} />)
        )}
      </section>
    </div>
  );
}
