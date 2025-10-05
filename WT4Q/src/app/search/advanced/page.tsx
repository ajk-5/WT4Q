'use client';

import { useState } from 'react';
import ArticleCard, { Article } from '@/components/ArticleCard';
import { API_ROUTES } from '@/lib/api';
import { CATEGORIES } from '@/lib/categories';
import { ARTICLE_TYPES } from '@/lib/articleTypes';
import styles from '../search.module.css';

type PagedResult<T> = { page: number; pageSize: number; total: number; totalPages: number; items: T[] };

export default function AdvancedSearchPage() {
  const [title, setTitle] = useState('');
  const [keyword, setKeyword] = useState('');
  const [date, setDate] = useState('');
  const [type, setType] = useState('');
  const [category, setCategory] = useState('');
  const [results, setResults] = useState<Article[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [sort, setSort] = useState<'date_desc' | 'date_asc' | 'relevance'>('date_desc');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (title) params.append('title', title);
    if (keyword) params.append('keyword', keyword);
    if (date) { params.append('from', date); params.append('to', date); }
    if (type) params.append('type', type);
    if (category) params.append('category', category);
    params.append('sort', sort);
    params.append('page', String(page));
    params.append('pageSize', '12');
    setLoading(true);
    try {
      const res = await fetch(API_ROUTES.ARTICLE.SEARCH_PAGED(params.toString()));
      if (!res.ok) throw new Error('search failed');
      const data: PagedResult<Article> = await res.json();
      setResults(Array.isArray(data.items) ? data.items : []);
      setTotalPages(data.totalPages || 0);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <form onSubmit={handleSubmit} className={styles.form}>
        <input
          type="text"
          placeholder="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className={styles.input}
        />
        <input
          type="text"
          placeholder="Keyword"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          className={styles.input}
        />
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className={styles.input}
        />
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className={styles.input}
        >
          <option value="">Any Type</option>
          {ARTICLE_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className={styles.input}
        >
          <option value="">Any Category</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as typeof sort)}
          className={styles.input}
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
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Prev
          </button>
          <span className={styles.pageInfo}>Page {page} / {totalPages}</span>
          <button
            className={styles.pageBtn}
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
