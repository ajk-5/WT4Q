'use client';

import type { ReactNode } from 'react';
import PrefetchLink from '@/components/PrefetchLink';
import styles from './ArticleCard.module.css';
import type { ArticleImage } from '@/lib/models';
import type { Comment } from '@/components/CommentsSection';
import { ReactionIcon } from '@/components/ReactionIcon';

function toPlainText(html: string) {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function truncateWords(text: string, words: number) {
  if (!text) return '';
  const parts = text.split(' ');
  if (parts.length <= words) return text;
  return `${parts.slice(0, words).join(' ')}…`;
}

function trimEllipsis(text: string) {
  return text.endsWith('…') ? text.slice(0, -1) : text;
}

export interface Article {
  id: string;
  slug: string;
  title: string;
  summary: string;
  createdDate?: string;
  views?: number;
  content: string;
  images?: ArticleImage[];
  countryName?: string;
  comments?: Comment[];
  commentsCount?: number;
  like?: { id: number; type: number | string }[];
  likesCount?: number;
  likeCount?: number;
  reactionsCount?: number;
}

function formatCount(value?: number) {
  return typeof value === 'number' ? value.toLocaleString() : undefined;
}

export default function ArticleCard({ article }: { article: Article }) {
  const baseText = toPlainText(article.summary || article.content || '');
  const snippet = truncateWords(baseText, 50);
  const readMoreLead = trimEllipsis(truncateWords(baseText, 12));
  const articleHref = `/articles/${article.slug}`;

  const reactionsCount = (() => {
    if (Array.isArray(article.like)) return article.like.length;
    if (typeof article.reactionsCount === 'number') return article.reactionsCount;
    if (typeof article.likesCount === 'number') return article.likesCount;
    if (typeof article.likeCount === 'number') return article.likeCount;
    return undefined;
  })();

  const commentsCount = (() => {
    if (Array.isArray(article.comments)) return article.comments.length;
    if (typeof article.commentsCount === 'number') return article.commentsCount;
    const anyArticle = article as unknown as Record<string, unknown>;
    const alt = anyArticle['commentCount'] as number | undefined;
    return typeof alt === 'number' ? alt : undefined;
  })();

  const metaItems = [
    article.views !== undefined
      ? {
          key: 'views',
          icon: (
            <svg
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
              className={styles.metaIcon}
              aria-hidden="true"
            >
              <path
                fill="currentColor"
                d="M12 5C7 5 2.73 8.11 1 12c1.73 3.89 6 7 11 7s9.27-3.11 11-7c-1.73-3.89-6-7-11-7Zm0 12a5 5 0 1 1 0-10 5 5 0 0 1 0 10Zm0-8a3 3 0 1 0 .001 6.001A3 3 0 0 0 12 9Z"
              />
            </svg>
          ),
          value: formatCount(article.views),
        }
      : null,
    reactionsCount !== undefined
      ? {
          key: 'reactions',
          icon: <ReactionIcon name="like" className={styles.metaIcon} />,
          value: formatCount(reactionsCount),
        }
      : null,
    commentsCount !== undefined
      ? {
          key: 'comments',
          icon: (
            <svg
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
              className={styles.metaIcon}
              aria-hidden="true"
            >
              <path
                fill="currentColor"
                d="M4 4h16a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H8.83L5 20.5V17H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Zm2 5a1 1 0 1 0 0 2h12a1 1 0 1 0 0-2H6Zm0 4a1 1 0 1 0 0 2h8a1 1 0 1 0 0-2H6Z"
              />
            </svg>
          ),
          value: formatCount(commentsCount),
        }
      : null,
    article.countryName
      ? {
          key: 'country',
          icon: (
            <svg
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
              className={styles.metaIcon}
              aria-hidden="true"
            >
              <path fill="currentColor" d="M4 3h2v18H4V3Zm3 1h9l-1.5 2L16 8H7V4Z" />
            </svg>
          ),
          value: article.countryName,
        }
      : null,
  ].filter((item): item is { key: string; icon: ReactNode; value?: string } => Boolean(item && item.value));

  return (
    <article className={styles.card}>
      <h2 className={styles.title}>
        <PrefetchLink href={articleHref} className={styles.titleLink}>
          {article.title}
        </PrefetchLink>
      </h2>

      {snippet && <p className={styles.summary}>{snippet}</p>}

      <PrefetchLink
        href={articleHref}
        className={styles.readMore}
        aria-label={`Read more: ${article.title}`}
      >
        {readMoreLead ? `${readMoreLead} Read more…` : 'Read more…'}
      </PrefetchLink>

      {metaItems.length > 0 && (
        <p className={styles.meta}>
          {metaItems.map((item, index) => (
            <span key={item.key} className={styles.metaItem}>
              {index > 0 && (
                <span className={styles.sep} aria-hidden>
                  |
                </span>
              )}
              {item.icon}
              <span>{item.value}</span>
            </span>
          ))}
        </p>
      )}
    </article>
  );
}
