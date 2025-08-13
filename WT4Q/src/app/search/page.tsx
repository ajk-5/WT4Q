'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import PrefetchLink from '@/components/PrefetchLink';
import ArticleCard, { Article } from '@/components/ArticleCard';
import { API_ROUTES } from '@/lib/api';
import styles from './search.module.css';

function SearchContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Article[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const q = searchParams.get('q') || '';
    setQuery(q);
    if (!q) {
      setResults([]);
      return;
    }

    (async () => {
      setLoading(true);
      try {
        const res = await fetch(API_ROUTES.ARTICLE.SEARCH(q));
        if (res.ok) {
          const data: Article[] = await res.json();
          setResults(data);
        } else {
          setResults([]);
        }
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [searchParams]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = query.trim();
    router.replace(`/search${trimmed ? `?q=${encodeURIComponent(trimmed)}` : ''}`);
  };

  return (
    <div className={styles.container}>
      <form onSubmit={handleSearch} className={styles.form}>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search articles..."
          className={styles.input}
        />
        <button type="submit" disabled={loading} className={styles.button}>
          Search
        </button>
      </form>
      <PrefetchLink href="/search/advanced" className={styles.advancedLink}>
        Advanced search
      </PrefetchLink>
      <div className={styles.results}>
        {results.map((a) => (
          <ArticleCard key={a.id} article={a} />
        ))}
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense>
      <SearchContent />
    </Suspense>
  );
}
