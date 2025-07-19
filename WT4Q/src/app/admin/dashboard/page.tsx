'use client';

import { useState, useEffect, FormEvent, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { API_ROUTES } from '@/lib/api';
import { ARTICLE_TYPES } from '@/lib/articleTypes';
import { CATEGORIES } from '@/lib/categories';
import styles from './dashboard.module.css';

export default function AdminDashboard() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState('');
  const [category, setCategory] = useState('');
  const [keywords, setKeywords] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!document.cookie.includes('AdminToken=')) {
      router.replace('/admin-login');
    }
  }, [router]);

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        const body = {
          title,
          category: category ? CATEGORIES.indexOf(category) + 1 : 0,
          articleType: type ? ARTICLE_TYPES.indexOf(type) : 0,
          createdDate: new Date().toISOString(),
          description,
          keyword: keywords
            .split(',')
            .map((k) => k.trim())
            .filter((k) => k.length > 0),
        };
        const res = await fetch(API_ROUTES.ARTICLE.CREATE, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(body),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data.message || 'Failed to publish');
        }
        setTitle('');
        setDescription('');
        setType('');
        setCategory('');
        setKeywords('');
      } catch (err) {
        if (err instanceof Error) setError(err.message);
        else setError('Failed to publish');
      }
    });
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Admin Dashboard</h1>
      {error && <p className={styles.error}>{error}</p>}
      <form onSubmit={handleSubmit} className={styles.form}>
        <input
          type="text"
          placeholder="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className={styles.input}
          required
        />
        <textarea
          placeholder="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={5}
          className={styles.textarea}
          required
        />
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className={styles.select}
          required
        >
          <option value="" disabled>
            Select Type
          </option>
          {ARTICLE_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className={styles.select}
          required
        >
          <option value="" disabled>
            Select Category
          </option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <input
          type="text"
          placeholder="Keywords (comma separated)"
          value={keywords}
          onChange={(e) => setKeywords(e.target.value)}
          className={styles.input}
        />
        <button type="submit" disabled={isPending} className={styles.button}>
          {isPending ? 'Publishing...' : 'Publish'}
        </button>
      </form>
    </div>
  );
}
