'use client';

import { useState } from 'react';
import ArticleCard, { Article } from '@/components/ArticleCard';
import { API_ROUTES } from '@/lib/api';
import { CATEGORIES } from '@/lib/categories';
import { ARTICLE_TYPES } from '@/lib/articleTypes';
import styles from '../search.module.css';

export default function AdvancedSearchPage() {
  const [title, setTitle] = useState('');
  const [keyword, setKeyword] = useState('');
  const [date, setDate] = useState('');
  const [type, setType] = useState('');
  const [category, setCategory] = useState('');
  const [results, setResults] = useState<Article[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (title) params.append('title', title);
    if (keyword) params.append('keyword', keyword);
    if (date) params.append('date', date);
    if (type) params.append('type', type);
    if (category) params.append('category', category);
    setLoading(true);
    try {
      const res = await fetch(`${API_ROUTES.ARTICLE.FILTER}?${params.toString()}`);
      if (res.ok) {
        setResults(await res.json());
      } else {
        setResults([]);
      }
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
        <button type="submit" disabled={loading} className={styles.button}>
          Search
        </button>
      </form>
      <div className={styles.results}>
        {results.map((a) => (
          <ArticleCard key={a.id} article={a} />
        ))}
      </div>
    </div>
  );
}
