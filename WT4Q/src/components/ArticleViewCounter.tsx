'use client';

import { useEffect, useState } from 'react';
import { API_ROUTES } from '@/lib/api';

function extractViews(data: unknown): number | null {
  if (!data || typeof data !== 'object') return null;
  const record = data as Record<string, unknown>;
  const candidates = ['views', 'viewCount', 'viewsCount'];
  for (const key of candidates) {
    const value = record[key];
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
  }
  return null;
}

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
  const [views, setViews] = useState<number | null>(
    typeof initialViews === 'number' && Number.isFinite(initialViews)
      ? initialViews
      : null,
  );

  useEffect(() => {
    if (!articleId) return undefined;

    let cancelled = false;

    const update = async () => {
      try {
        const res = await fetch(API_ROUTES.ARTICLE.GET_BY_ID(articleId), {
          cache: 'no-store',
        });
        if (!res.ok) return;
        const data = await res.json();
        const next = extractViews(data);
        if (!cancelled && typeof next === 'number') {
          setViews(next);
        }
      } catch {
        // Ignore network errors; they likely mean the API is temporarily unavailable.
      }
    };

    const initialTimeout = setTimeout(update, 1200);
    const interval = setInterval(update, pollIntervalMs);

    return () => {
      cancelled = true;
      clearTimeout(initialTimeout);
      clearInterval(interval);
    };
  }, [articleId, pollIntervalMs]);

  if (views === null) {
    return null;
  }

  return <> | {views.toLocaleString()} views</>;
}
