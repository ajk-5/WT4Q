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
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');

  useEffect(() => {
    apiFetch(API_ROUTES.USERS.ME, { method: 'GET' })
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((user: { userName?: string }) => {
        setLoggedInState(true);
        setCurrentUser(user.userName || null);
      })
      .catch(() => setLoggedInState(false));

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

  const handleEditStart = (c: Comment) => {
    setEditingId(c.id);
    setEditingText(c.content);
    setMenuOpen(null);
  };

  const handleEditSubmit = async (
    e: FormEvent<HTMLFormElement>,
    id: string
  ) => {
    e.preventDefault();
    const trimmed = editingText.trim();
    if (!trimmed) return;
    try {
      const res = await apiFetch(
        `${API_ROUTES.ARTICLE.MODIFY_COMMENT}?CommentId=${id}&Comment=${encodeURIComponent(trimmed)}`,
        { method: 'PUT' }
      );
      if (res.ok) {
        setComments((prev) =>
          prev.map((c) => (c.id === id ? { ...c, content: trimmed } : c))
        );
        setEditingId(null);
        setEditingText('');
      }
    } catch {
      // ignore
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await apiFetch(
        `${API_ROUTES.ARTICLE.MODIFY_COMMENT}?CommentId=${id}`,
        { method: 'DELETE' }
      );
      if (res.ok) {
        setComments((prev) => prev.filter((c) => c.id !== id));
      }
    } catch {
      // ignore
    }
    setMenuOpen(null);
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
              {editingId === c.id ? (
                <form
                  onSubmit={(e) => handleEditSubmit(e, c.id)}
                  className={styles.editForm}
                >
                  <textarea
                    value={editingText}
                    onChange={(e) => setEditingText(e.target.value)}
                    rows={3}
                    required
                    className={styles.textarea}
                  />
                  <div className={styles.editActions}>
                    <button type="submit" className={styles.button}>
                      Save
                    </button>
                    <button
                      type="button"
                      className={styles.button}
                      onClick={() => {
                        setEditingId(null);
                        setEditingText('');
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <p className={styles.commentContent}>{c.content}</p>
              )}
              <div className={styles.commentActions}>
                {currentUser && currentUser === c.writer?.userName && (
                  <div className={styles.menuWrapper}>
                    <button
                      type="button"
                      className={styles.menuButton}
                      onClick={() =>
                        setMenuOpen(menuOpen === c.id ? null : c.id)
                      }
                      aria-label="Comment options"
                    >
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 4 16"
                        fill="currentColor"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <circle cx="2" cy="2" r="2" />
                        <circle cx="2" cy="8" r="2" />
                        <circle cx="2" cy="14" r="2" />
                      </svg>
                    </button>
                    {menuOpen === c.id && (
                      <div className={styles.menu}>
                        <button
                          type="button"
                          className={styles.menuItem}
                          onClick={() => handleEditStart(c)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className={styles.menuItem}
                          onClick={() => handleDelete(c.id)}
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                )}
                {loggedIn && editingId !== c.id && (
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
