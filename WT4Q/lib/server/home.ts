import 'server-only';

import type { Article } from '@/components/ArticleCard';
import type { BreakingArticle } from '@/components/BreakingNewsSlider';
import type { TrendingArticle } from '@/components/TrendingNewsSlider';
import { API_ROUTES } from '@/lib/api';
import { getArticlesByCategory } from '@/lib/server/articles';

const SPOTLIGHT_LIMIT = 8;
const TRENDING_LIMIT = 8;
const INFO_LIMIT = 14;

function byNewest(a: Article, b: Article): number {
  return new Date(b.createdDate ?? 0).getTime() - new Date(a.createdDate ?? 0).getTime();
}

function byEngagementThenNewest(a: Article, b: Article): number {
  const aScore = (a.views ?? 0) + (a.reactionsCount ?? a.likesCount ?? a.likeCount ?? 0) * 2 + (a.commentsCount ?? 0) * 3;
  const bScore = (b.views ?? 0) + (b.reactionsCount ?? b.likesCount ?? b.likeCount ?? 0) * 2 + (b.commentsCount ?? 0) * 3;
  return bScore - aScore || byNewest(a, b);
}

function toBreakingArticle(article: Article): BreakingArticle {
  return {
    id: article.id,
    slug: article.slug,
    title: article.title,
    content: article.content,
    images: article.images,
    createdDate: article.createdDate,
  };
}

function toTrendingArticle(article: Article, index: number): TrendingArticle {
  return {
    id: article.id,
    slug: article.slug,
    title: article.title,
    content: article.content,
    images: article.images,
    createdDate: article.createdDate,
    rank: index + 1,
  };
}

async function fetchInfoArticles(): Promise<Article[]> {
  try {
    return await getArticlesByCategory('Info', { limit: INFO_LIMIT });
  } catch {
    return [];
  }
}

async function fetchTrendingArticles(limit = TRENDING_LIMIT): Promise<Article[]> {
  try {
    const res = await fetch(API_ROUTES.ARTICLE.TRENDING(limit), {
      next: { revalidate: 120 },
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return [];
    const data = (await res.json()) as Article[];
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export async function loadHomePageContent() {
  const [infoArticles, trendingArticles] = await Promise.all([
    fetchInfoArticles(),
    fetchTrendingArticles(),
  ]);

  const spotlightSource = (infoArticles.length > 0 ? infoArticles : trendingArticles)
    .slice()
    .sort(byNewest);

  const spotlightArticles = spotlightSource
    .slice(0, SPOTLIGHT_LIMIT)
    .map(toBreakingArticle);

  const rankedTrending = trendingArticles
    .slice()
    .sort(byEngagementThenNewest)
    .slice(0, TRENDING_LIMIT)
    .map(toTrendingArticle);

  const latestArticles = infoArticles
    .slice()
    .sort(byNewest)
    .slice(0, 4);

  return {
    latestArticles,
    spotlightArticles,
    trendingArticles: rankedTrending,
  };
}
