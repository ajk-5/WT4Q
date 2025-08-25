'use client';

import { useState, useEffect } from 'react';
import PrefetchLink from '@/components/PrefetchLink';
import { API_ROUTES, apiFetch } from '@/lib/api';
import styles from './ReactionButtons.module.css';
import {
  ReactionIcon,
  ReactionName,
  reactionType,
} from '@/components/ReactionIcon';

interface Props {
  articleId: string;
  initialLikes: number;
  initialHappy: number;
  initialDislikes: number;
  initialSad: number;
}

export default function ReactionButtons({
  articleId,
  initialLikes,
  initialHappy,
  initialDislikes,
  initialSad,
}: Props) {
  const [likes, setLikes] = useState(initialLikes);
  const [happy, setHappy] = useState(initialHappy);
  const [dislikes, setDislikes] = useState(initialDislikes);
  const [sad, setSad] = useState(initialSad);
  const [status, setStatus] = useState<ReactionName | null>(null);
  const [showLogin, setShowLogin] = useState(false);
  const [loginHref, setLoginHref] = useState('/login');

  useEffect(() => {
    setLoginHref(`/login?returnUrl=${encodeURIComponent(window.location.href + '#reactions')}`);
  }, []);

  useEffect(() => {
    setLikes(initialLikes);
    setHappy(initialHappy);
    setDislikes(initialDislikes);
    setSad(initialSad);
  }, [initialLikes, initialHappy, initialDislikes, initialSad]);

  const adjust = (name: ReactionName, delta: number) => {
    switch (name) {
      case 'like':
        setLikes((l) => l + delta);
        break;
      case 'happy':
        setHappy((h) => h + delta);
        break;
      case 'dislike':
        setDislikes((d) => d + delta);
        break;
      case 'sad':
        setSad((s) => s + delta);
        break;
    }
  };

  const send = async (name: ReactionName) => {
    const type = reactionType[name];
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
        adjust(name, -1);
        setStatus(null);
      } else if (data.message === 'Like changed') {
        if (status) adjust(status, -1);
        adjust(name, +1);
        setStatus(name);
      } else if (data.message === 'Liked') {
        if (status && status !== name) adjust(status, -1);
        adjust(name, +1);
        setStatus(name);
      }
    } catch {
      /* ignore */
    }
  };

  return (
    <>
      <div className={styles.container}>
        <button
          onClick={() => send('like')}
          className={styles.button}
          aria-pressed={status === 'like'}
        >
          <ReactionIcon name="like" />
          <span className={styles.count}>{likes}</span>
        </button>
        <button
          onClick={() => send('happy')}
          className={styles.button}
          aria-pressed={status === 'happy'}
        >
          <ReactionIcon name="happy" />
          <span className={styles.count}>{happy}</span>
        </button>
        <button
          onClick={() => send('dislike')}
          className={styles.button}
          aria-pressed={status === 'dislike'}
        >
          <ReactionIcon name="dislike" />
          <span className={styles.count}>{dislikes}</span>
        </button>
        <button
          onClick={() => send('sad')}
          className={styles.button}
          aria-pressed={status === 'sad'}
        >
          <ReactionIcon name="sad" />
          <span className={styles.count}>{sad}</span>
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
