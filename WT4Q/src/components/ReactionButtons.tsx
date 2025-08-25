'use client';

import { useState, useEffect } from 'react';
import PrefetchLink from '@/components/PrefetchLink';
import { API_ROUTES, apiFetch } from '@/lib/api';
import styles from './ReactionButtons.module.css';

interface Props {
  articleId: string;
  initialLikes: number;
  initialDislikes: number;
}

export default function ReactionButtons({ articleId, initialLikes, initialDislikes }: Props) {
  const [likes, setLikes] = useState(initialLikes);
  const [dislikes, setDislikes] = useState(initialDislikes);
  const [status, setStatus] = useState<'like' | 'dislike' | null>(null);
  const [showLogin, setShowLogin] = useState(false);
  const [loginHref, setLoginHref] = useState('/login');

  useEffect(() => {
    setLoginHref(`/login?returnUrl=${encodeURIComponent(window.location.href + '#reactions')}`);
  }, []);

  const send = async (type: 0 | 2) => {
    try {
      const res = await apiFetch(
        API_ROUTES.ARTICLE.LIKE(articleId),
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type }),
        }
      );
      if (res.status === 401) {
        setShowLogin(true);
        return;
      }
      if (!res.ok) {
        const msg = await res.json().catch(() => ({}));
        throw new Error(msg?.message || `Failed: ${res.status}`);
      }
      const data = await res.json();
      if (data.message === 'unliked') {
        if (type === 0) setLikes((l) => l - 1);
        else setDislikes((d) => d - 1);
        setStatus(null);
      } else if (data.message === 'Like changed') {
        if (type === 0) {
          setLikes((l) => l + 1);
          setDislikes((d) => d - 1);
          setStatus('like');
        } else {
          setDislikes((d) => d + 1);
          setLikes((l) => l - 1);
          setStatus('dislike');
        }
      } else if (data.message === 'Liked') {
        if (type === 0) {
          setLikes((l) => l + 1);
          setStatus('like');
        } else {
          setDislikes((d) => d + 1);
          setStatus('dislike');
        }
      }
    } catch {
      /* ignore */
    }
  };

  return (
    <>
      <div className={styles.container}>
        <button
          onClick={() => send(0)}
          className={styles.button}
          aria-pressed={status === 'like'}
        >
          👍 <span className={styles.count}>{likes}</span>
        </button>
        <button
          onClick={() => send(2)}
          className={styles.button}
          aria-pressed={status === 'dislike'}
        >
          👎 <span className={styles.count}>{dislikes}</span>
        </button>
      </div>
      {showLogin && (
        <div className={styles.overlay} onClick={() => setShowLogin(false)}>
          <div className={styles.prompt} onClick={(e) => e.stopPropagation()}>
            <p>Login to react</p>
            <PrefetchLink href={loginHref}>Go to login</PrefetchLink>
          </div>
        </div>
      )}
    </>
  );
}
