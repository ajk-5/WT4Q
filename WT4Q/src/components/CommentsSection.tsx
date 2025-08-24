'use client';

import { useState, FormEvent, useEffect } from 'react';
import PrefetchLink from '@/components/PrefetchLink';
import { API_ROUTES, apiFetch } from '@/lib/api';
import styles from './CommentsSection.module.css';

export interface Comment {
  id: string;
  content: string;
  writer?: { userName?: string };
  parentCommentId?: string;
  reportCount?: number;
}

export default function CommentsSection({
  articleId,
  initialComments,
}: {
  articleId: string;
  initialComments: Comment[];
}) {
  const [comments, setComments] = useState<Comment[]>(initialComments);
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [reported, setReported] = useState<Record<string, boolean>>({});
  const [loggedIn, setLoggedInState] = useState(false);
  const [loginHref, setLoginHref] = useState('/login');

  useEffect(() => {
    apiFetch(API_ROUTES.USERS.ME)

      .then((res) => setLoggedIn(res.ok))
      .catch(() => setLoggedIn(false));

    setLoginHref(
      `/login?returnUrl=${encodeURIComponent(window.location.href + '#comments')}`
    );
  }, []);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const trimmed = content.trim();
    if (!trimmed) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await apiFetch(
        `${API_ROUTES.ARTICLE.COMMENT}?ArticleId=${articleId}&Comment=${encodeURIComponent(trimmed)}${
          replyTo ? `&ParentCommentId=${replyTo}` : ''
        }`,
        { method: 'POST' }
      );
      if (res.ok) {
        let newComment: Comment | null = null;
        try {
          newComment = await res.json();
        } catch {
          newComment = null;
        }
        setComments([
          ...comments,
          newComment || { id: Date.now().toString(), content: trimmed },
        ]);
        setContent('');
        setReplyTo(null);
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.message || 'Failed to post comment');
      }
    } catch {
      setError('Failed to post comment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReport = async (id: string) => {
    if (reported[id]) return;
    try {
      const res = await apiFetch(
        `${API_ROUTES.ARTICLE.REPORT_COMMENT}?CommentId=${id}`,
        { method: 'POST' }
      );
      if (res.ok) {
        setComments((prev) =>
          prev.map((c) =>
            c.id === id
              ? { ...c, reportCount: (c.reportCount || 0) + 1 }
              : c
          )
        );
        setReported({ ...reported, [id]: true });
      }
    } catch {
      // ignore
    }
  };

  return (
    <section id="comments" className={styles.section}>
      <h2 className={styles.heading}>Comments</h2>
      {comments.length === 0 ? (
        <p>No comments yet.</p>
      ) : (
        <ul className={styles.commentList}>
          {comments.map((c) => (
            <li key={c.id} className={styles.comment}>
              <span className={styles.commentAuthor}>{c.writer?.userName || 'Anonymous'}:</span>
              <p className={styles.commentContent}>{c.content}</p>
              <div className={styles.commentActions}>
                {loggedIn && (
                  <button
                    type="button"
                    className={styles.replyButton}
                    onClick={() => setReplyTo(c.id)}
                  >
                    Reply
                  </button>
                )}
                <button
                  type="button"
                  className={styles.reportButton}
                  onClick={() => handleReport(c.id)}
                  disabled={reported[c.id]}
                  aria-label="Report comment"
                >
                  <img src="/report.svg" alt="Report" />
                  {c.reportCount ? (
                    <span className={styles.reportCount}>{c.reportCount}</span>
                  ) : null}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {replyTo && loggedIn && (
        <p className={styles.replying}>Replying to a comment</p>
      )}
      {loggedIn ? (
        <form onSubmit={handleSubmit} className={styles.form}>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={3}
            required
            className={styles.textarea}
            placeholder="Share your thoughts..."
          />
          <button type="submit" disabled={submitting} className={styles.button}>
            Post Comment
          </button>
          {error && <p className={styles.error}>{error}</p>}
        </form>
      ) : (
        <p className={styles.loginPrompt}>
          <PrefetchLink href={loginHref}>Log in to comment</PrefetchLink>
        </p>
      )}
    </section>
  );
}
