'use client';

import useArticleViews from '@/hooks/useArticleViews';

interface ArticleViewCounterProps {
  articleId: string;
  initialViews?: number | null;
  pollIntervalMs?: number;
}

export default function ArticleViewCounter({
  articleId,
  initialViews,
  pollIntervalMs = 30000,
}: ArticleViewCounterProps) {
  const views = useArticleViews(articleId, {
    initial: typeof initialViews === 'number' ? initialViews : null,
    initialDelayMs: 1200,
    refreshIntervalMs: pollIntervalMs,
    forceInitialFetch: true,
  });

  if (views === null) {
    return null;
  }

  return <> | {views.toLocaleString()} views</>;
}
