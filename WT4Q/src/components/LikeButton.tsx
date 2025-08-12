'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
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
  const [showLogin, setShowLogin] = useState(false);
  const [loginHref, setLoginHref] = useState('/login');

  useEffect(() => {
    setLoginHref(
      `/login?returnUrl=${encodeURIComponent(window.location.href + '#like')}`
    );
  }, []);

  const toggle = async () => {
    try {
      const res = await fetch(
        `${API_ROUTES.ARTICLE.LIKE}?ArticleId=${articleId}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ type: 0 }),
        }
      );
      if (res.status === 401) {
        setShowLogin(true);
        return;
      }
      if (res.ok) {
        setLiked(!liked);
        setCount(count + (liked ? -1 : 1));
      }
    } catch {
      /* ignore */
    }
  };
  return (
    <>
      <button
        id="like"
        onClick={toggle}
        className={styles.button}
        aria-pressed={liked}
      >
        👍 <span className={styles.count}>{count}</span>
      </button>
      {showLogin && (
        <div className={styles.overlay} onClick={() => setShowLogin(false)}>
          <div className={styles.prompt} onClick={(e) => e.stopPropagation()}>
            <p>Login to like</p>
            <Link href={loginHref}>Go to login</Link>
          </div>
        </div>
      )}
    </>
  );
}
