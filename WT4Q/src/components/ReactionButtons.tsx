'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { API_ROUTES } from '@/lib/api';
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
      const res = await fetch(
        `${API_ROUTES.ARTICLE.LIKE}?Id=${articleId}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ type }),
        }
      );
      if (res.status === 401) {
        setShowLogin(true);
        return;
      }
      if (res.ok) {
        const data = await res.json();
        if (data.message === 'unliked') {
          if (type === 0) setLikes(likes - 1);
          else setDislikes(dislikes - 1);
          setStatus(null);
        } else if (data.message === 'Like changed') {
          if (type === 0) {
            setLikes(likes + 1);
            setDislikes(dislikes - 1);
            setStatus('like');
          } else {
            setDislikes(dislikes + 1);
            setLikes(likes - 1);
            setStatus('dislike');
          }
        } else if (data.message === 'Liked') {
          if (type === 0) {
            setLikes(likes + 1);
            setStatus('like');
          } else {
            setDislikes(dislikes + 1);
            setStatus('dislike');
          }
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
            <Link href={loginHref}>Go to login</Link>
          </div>
        </div>
      )}
    </>
  );
}

