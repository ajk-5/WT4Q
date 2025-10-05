"use client";

import { FormEvent, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import PrefetchLink from '@/components/PrefetchLink';
import ArticleCard, { Article } from '@/components/ArticleCard';
import { API_ROUTES } from '@/lib/api';
import styles from './search.module.css';

type PagedResult<T> = { page: number; pageSize: number; total: number; totalPages: number; items: T[] };

export default function SearchContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Article[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [sort, setSort] = useState<'date_desc' | 'date_asc' | 'relevance'>('date_desc');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const q = searchParams.get('q') || '';
    const p = Number(searchParams.get('page') || '1') || 1;
    const s = (searchParams.get('sort') as 'date_desc' | 'date_asc' | 'relevance') || 'date_desc';
    setQuery(q);
    setPage(p);
    setSort(s);
    if (!q) {
      setResults([]);
      setTotalPages(0);
      return;
    }

    (async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ q, page: String(p), pageSize: '12', sort: s });
        const res = await fetch(API_ROUTES.ARTICLE.SEARCH_PAGED(params.toString()));
        if (!res.ok) throw new Error('search failed');
        const data: PagedResult<Article> = await res.json();
        setResults(Array.isArray(data.items) ? data.items : []);
        setTotalPages(data.totalPages || 0);
      } catch {
        setResults([]);
        setTotalPages(0);
      } finally {
        setLoading(false);
      }
    })();
  }, [searchParams]);

  const handleSearch = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const trimmed = query.trim();
    const params = new URLSearchParams();
    if (trimmed) params.set('q', trimmed);
    if (sort) params.set('sort', sort);
    params.set('page', '1');
    router.replace(`/search${params.toString() ? `?${params.toString()}` : ''}`);
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
        <select
          value={sort}
          onChange={(e) => {
            const v = e.target.value as typeof sort;
            setSort(v);
          }}
          className={styles.select}
          aria-label="Sort results"
        >
          <option value="date_desc">Newest</option>
          <option value="date_asc">Oldest</option>
          <option value="relevance">Relevance</option>
        </select>
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
      {totalPages > 1 && (
        <div className={styles.pager}>
          <button
            className={styles.pageBtn}
            disabled={page <= 1}
            onClick={() => router.replace(`/search?q=${encodeURIComponent(query)}&sort=${sort}&page=${page - 1}`)}
          >
            Prev
          </button>
          <span className={styles.pageInfo}>Page {page} / {totalPages}</span>
          <button
            className={styles.pageBtn}
            disabled={page >= totalPages}
            onClick={() => router.replace(`/search?q=${encodeURIComponent(query)}&sort=${sort}&page=${page + 1}`)}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
