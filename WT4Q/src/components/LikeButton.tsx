'use client';

import { useState } from 'react';
import { API_ROUTES } from '@/lib/api';
import styles from './LikeButton.module.css';

export default function LikeButton({
  articleId,
  initialCount,
}: {
  articleId: string;
  initialCount: number;
}) {
  const [count, setCount] = useState(initialCount);
  const [liked, setLiked] = useState(false);
  const toggle = async () => {
    try {
      const res = await fetch(`${API_ROUTES.ARTICLE.LIKE}?Id=${articleId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ type: 0 }),
      });
      if (res.ok) {
        setLiked(!liked);
        setCount(count + (liked ? -1 : 1));
      }
    } catch {
      /* ignore */
    }
  };
  return (
    <button onClick={toggle} className={styles.button} aria-pressed={liked}>
      👍 <span className={styles.count}>{count}</span>
    </button>
  );
}
