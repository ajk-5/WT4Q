import 'server-only';

import { unstable_cache } from 'next/cache';
import { API_ROUTES } from '@/lib/api';
import type { Article } from '@/components/ArticleCard';
import type { ArticleImage } from '@/lib/models';
import { stripHtml, truncateWords } from '@/lib/text';

const DEFAULT_LIMIT = 12;
const MAX_LIMIT = 120;
const MAX_CONTENT_LENGTH = 3000;
const SUMMARY_WORD_LIMIT = 80;

type RawImage = {
  photo?: string | null;
  photoLink?: string | null;
  altText?: string | null;
  caption?: string | null;
};

type RawArticle = {
  id: string;
  slug: string;
  title: string;
  summary?: string | null;
  content?: string | null;
  createdDate?: string | null;
  views?: number | null;
  images?: RawImage[] | null;
  countryName?: string | null;
  comments?: unknown[] | null;
  commentsCount?: number | null;
  like?: unknown[] | null;
  likesCount?: number | null;
  likeCount?: number | null;
  reactionsCount?: number | null;
};

function normalizeLimit(limit?: number): number {
  if (typeof limit !== 'number' || !Number.isFinite(limit)) {
    return DEFAULT_LIMIT;
  }
  const safe = Math.floor(limit);
  if (safe < 1) return 1;
  if (safe > MAX_LIMIT) return MAX_LIMIT;
  return safe;
}

function normalizeImages(images?: RawImage[] | null): ArticleImage[] | undefined {
  if (!Array.isArray(images) || images.length === 0) {
    return undefined;
  }

  const first = images.find(
    (img): img is RawImage => Boolean(img && (img.photoLink || img.photo)),
  );
  if (!first) {
    return undefined;
  }

  const sanitized: ArticleImage = {
    photoLink: first.photoLink ?? undefined,
    altText: first.altText ?? undefined,
    caption: first.caption ?? undefined,
  };

  if (!sanitized.photoLink && typeof first.photo === 'string' && first.photo.length > 0) {
    sanitized.photo = first.photo;
  }

  return [sanitized];
}

function deriveSummary(article: RawArticle, fallback: string): string {
  const source =
    typeof article.summary === 'string' && article.summary.trim().length > 0
      ? article.summary
      : fallback;
  const plain = stripHtml(source ?? '').trim();
  if (!plain) return '';
  return truncateWords(plain, SUMMARY_WORD_LIMIT);
}

function computeCommentsCount(article: RawArticle): number | undefined {
  if (typeof article.commentsCount === 'number' && Number.isFinite(article.commentsCount)) {
    return article.commentsCount;
  }
  if (Array.isArray(article.comments)) {
    return article.comments.length;
  }
  return undefined;
}

function computeReactionCounts(article: RawArticle): {
  reactionsCount?: number;
  likesCount?: number;
  likeCount?: number;
} {
  const likeArrayCount = Array.isArray(article.like) ? article.like.length : undefined;
  const likesCount =
    typeof article.likesCount === 'number' && Number.isFinite(article.likesCount)
      ? article.likesCount
      : likeArrayCount;
  const likeCount =
    typeof article.likeCount === 'number' && Number.isFinite(article.likeCount)
      ? article.likeCount
      : undefined;
  const reactionsCount =
    typeof article.reactionsCount === 'number' && Number.isFinite(article.reactionsCount)
      ? article.reactionsCount
      : likesCount ?? likeCount ?? likeArrayCount;

  return {
    reactionsCount,
    likesCount,
    likeCount,
  };
}

function sanitizeArticle(article: RawArticle): Article {
  const trimmedHtml =
    typeof article.content === 'string' && article.content.length > 0
      ? article.content.slice(0, MAX_CONTENT_LENGTH)
      : '';

  const summary = deriveSummary(article, trimmedHtml);

  const { reactionsCount, likesCount, likeCount } = computeReactionCounts(article);

  return {
    id: article.id,
    slug: article.slug,
    title: article.title,
    summary,
    content: trimmedHtml || summary,
    createdDate: article.createdDate ?? undefined,
    views:
      typeof article.views === 'number' && Number.isFinite(article.views)
        ? article.views
        : undefined,
    images: normalizeImages(article.images),
    countryName: article.countryName ?? undefined,
    commentsCount: computeCommentsCount(article),
    reactionsCount,
    likesCount,
    likeCount,
  };
}

const fetchCategoryArticles = unstable_cache(
  async (category: string, limit: number): Promise<Article[]> => {
    const trimmedCategory = category.trim();
    if (!trimmedCategory) {
      return [];
    }

    const url = new URL(API_ROUTES.ARTICLE.SEARCH_ADVANCED);
    url.searchParams.set('category', trimmedCategory);

    let response: Response;
    try {
      response = await fetch(url.toString(), {
        cache: 'no-store',
        headers: { Accept: 'application/json' },
      });
    } catch {
      return [];
    }

    if (!response.ok) {
      return [];
    }

    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      return [];
    }

    if (!Array.isArray(payload)) {
      return [];
    }

    const articles = (payload as RawArticle[])
      .filter((item) => item && typeof item.id === 'string' && typeof item.slug === 'string')
      .sort((a, b) => {
        const aTime = new Date(a.createdDate ?? 0).getTime();
        const bTime = new Date(b.createdDate ?? 0).getTime();
        return bTime - aTime;
      })
      .slice(0, limit)
      .map(sanitizeArticle);

    return articles;
  },
  ['articles-by-category'],
  { revalidate: 180 },
);

export async function getArticlesByCategory(
  category: string,
  options: { limit?: number } = {},
): Promise<Article[]> {
  const trimmedCategory = category.trim();
  if (!trimmedCategory) {
    return [];
  }

  const limit = normalizeLimit(options.limit);
  return fetchCategoryArticles(trimmedCategory, limit);
}
