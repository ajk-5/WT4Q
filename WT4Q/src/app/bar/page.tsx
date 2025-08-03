"use client";
import { useEffect, useState } from 'react';
import AgeGate from '@/components/AgeGate';
import { API_ROUTES } from '@/lib/api';
import styles from './bar.module.css';

interface Cocktail {
  id: number;
  name: string;
  description: string;
}

export default function BarPage() {
  const [query, setQuery] = useState('');
  const [list, setList] = useState<Cocktail[]>([]);

  useEffect(() => {
    async function load() {
      const url = query
        ? API_ROUTES.COCKTAIL.SEARCH(query)
        : API_ROUTES.COCKTAIL.GET_ALL;
      try {
        const res = await fetch(url, { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          setList(data);
        } else {
          setList([]);
        }
      } catch {
        setList([]);
      }
    }
    load();
  }, [query]);

  const content = (
    <div className={styles.container}>
      <h1 className={styles.title}>Cocktail Recipes</h1>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setQuery(query.trim());
        }}
        className={styles.form}
      >
        <input
          type="text"
          placeholder="Search cocktails..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className={styles.input}
        />
      </form>
      <ul className={styles.list}>
        {list.map((c) => (
          <li key={c.id} className={styles.item}>
            <h2>{c.name}</h2>
            <p>{c.description}</p>
          </li>
        ))}
      </ul>
    </div>
  );
  return <AgeGate storageKey="barVerified">{content}</AgeGate>;
}
