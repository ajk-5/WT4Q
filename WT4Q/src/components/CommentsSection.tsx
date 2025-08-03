'use client';

import { useState, FormEvent } from 'react';
import { API_ROUTES } from '@/lib/api';
import styles from './CommentsSection.module.css';

export interface Comment {
  id: string;
  content: string;
  writer?: { userName?: string };
  parentCommentId?: string;
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

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const trimmed = content.trim();
    if (!trimmed) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(
        `${API_ROUTES.ARTICLE.COMMENT}?ArticleId=${articleId}&Comment=${encodeURIComponent(trimmed)}${
          replyTo ? `&ParentCommentId=${replyTo}` : ''
        }`,
        { method: 'POST', credentials: 'include' }
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

  return (
    <section className={styles.section}>
      <h2 className={styles.heading}>Comments</h2>
      {comments.length === 0 ? (
        <p>No comments yet.</p>
      ) : (
        <ul className={styles.commentList}>
          {comments.map((c) => (
            <li key={c.id} className={styles.comment}>
              <span className={styles.commentAuthor}>{c.writer?.userName || 'Anonymous'}:</span>
              {c.content}
              <button
                type="button"
                className={styles.replyButton}
                onClick={() => setReplyTo(c.id)}
              >
                Reply
              </button>
            </li>
          ))}
        </ul>
      )}
      {replyTo && (
        <p className={styles.replying}>Replying to a comment</p>
      )}
      <form onSubmit={handleSubmit} className={styles.form}>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={3}
          required
          className={styles.textarea}
        />
        <button type="submit" disabled={submitting} className={styles.button}>
          Post Comment
        </button>
        {error && <p className={styles.error}>{error}</p>}
      </form>
    </section>
  );
}
