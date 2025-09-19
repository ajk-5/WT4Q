'use client';

import type { ReactElement } from 'react';
import PrefetchLink from '@/components/PrefetchLink';
import styles from './ArticleCard.module.css';
import type { ArticleImage } from '@/lib/models';
import type { Comment } from '@/components/CommentsSection';
import { ReactionIcon } from '@/components/ReactionIcon';
import useArticleViews from '@/hooks/useArticleViews';

function toPlainText(html: string) {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function truncateWords(text: string, words: number) {
  if (!text) return '';
  const parts = text.split(' ');
  if (parts.length <= words) return text;
  return parts.slice(0, words).join(' ') + '...';
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

function formatCount(value?: number | null) {
  return typeof value === 'number' && Number.isFinite(value) ? value.toLocaleString() : undefined;
}

export default function ArticleCard({ article }: { article: Article }) {
  const baseText = toPlainText(article.summary || article.content || '');
  const snippet = truncateWords(baseText, 50);
  const articleHref = `/articles/${article.slug}`;

  const liveViews = useArticleViews(article.id, {
    initial: typeof article.views === 'number' ? article.views : null,
    initialDelayMs: 800,
    forceInitialFetch: true,
    refreshIntervalMs: 120000,
  });
  const viewCount =
    typeof liveViews === 'number'
      ? liveViews
      : typeof article.views === 'number'
        ? article.views
        : undefined;

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

  type MetaItem = { key: string; icon: ReactElement; value: string };
  const metaItems: MetaItem[] = [];
  if (viewCount !== undefined) {
    metaItems.push({
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
      value: formatCount(viewCount) as string,
    });
  }
  if (reactionsCount !== undefined) {
    metaItems.push({
      key: 'reactions',
      icon: <ReactionIcon name="like" className={styles.metaIcon} />,
      value: formatCount(reactionsCount) as string,
    });
  }
  if (commentsCount !== undefined) {
    metaItems.push({
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
      value: formatCount(commentsCount) as string,
    });
  }
  if (article.countryName) {
    metaItems.push({
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
    });
  }

  return (
    <article className={styles.card}>
      <h2 className={styles.title}>
        <span className={styles.titleLink}>{article.title}</span>
      </h2>

      {snippet && (
        <p className={styles.summary}>
          {snippet}
          <span className={styles.readMoreInline}> READ MORE...</span>
        </p>
      )}

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

      {/* Full-card overlay link for click-anywhere */}
      <PrefetchLink href={articleHref} className={styles.cardOverlay} aria-label={`Open: ${article.title}`} />
    </article>
  );
}
