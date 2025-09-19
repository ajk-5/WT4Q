'use client';

import { useEffect, useSyncExternalStore } from 'react';
import { API_ROUTES } from '@/lib/api';

const CACHE_TTL_MS = 60_000;

type CacheEntry = {
  value: number | null;
  expiry: number;
  promise?: Promise<number | null>;
};

const viewCache = new Map<string, CacheEntry>();
const subscribers = new Map<string, Set<() => void>>();

function extractViews(data: unknown): number | null {
  if (!data || typeof data !== 'object') return null;
  const record = data as Record<string, unknown>;
  const candidates = ['views', 'viewCount', 'viewsCount'];
  for (const key of candidates) {
    const raw = record[key];
    if (typeof raw === 'number' && Number.isFinite(raw)) {
      return raw;
    }
  }
  return null;
}

async function requestViews(articleId: string): Promise<number | null> {
  const res = await fetch(API_ROUTES.ARTICLE.GET_BY_ID(articleId), { cache: 'no-store' });
  if (!res.ok) {
    throw new Error(`Failed to load views for article ${articleId}`);
  }
  try {
    const data = await res.json();
    return extractViews(data);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to parse views for article ${articleId}: ${reason}`);
  }
}

function notify(articleId: string) {
  const listeners = subscribers.get(articleId);
  if (!listeners) return;
  for (const listener of listeners) {
    listener();
  }
}

function setCache(articleId: string, value: number | null, ttl = CACHE_TTL_MS) {
  viewCache.set(articleId, {
    value,
    expiry: Date.now() + ttl,
  });
  notify(articleId);
}

async function loadViews(articleId: string, opts: { force?: boolean } = {}) {
  const { force = false } = opts;
  const entry = viewCache.get(articleId);
  const now = Date.now();
  if (!force && entry && entry.expiry > now && typeof entry.value === 'number') {
    return entry.value;
  }
  if (!force && entry?.promise) {
    return entry.promise;
  }

  const promise = requestViews(articleId)
    .then((value) => {
      setCache(articleId, value);
      return value;
    })
    .catch((error) => {
      if (entry) {
        viewCache.set(articleId, {
          value: entry.value ?? null,
          expiry: now + CACHE_TTL_MS / 2,
        });
      } else {
        viewCache.delete(articleId);
      }
      notify(articleId);
      throw error;
    });

  viewCache.set(articleId, {
    value: entry?.value ?? null,
    expiry: now + CACHE_TTL_MS,
    promise,
  });

  return promise;
}

function subscribe(articleId: string, onStoreChange: () => void) {
  let listeners = subscribers.get(articleId);
  if (!listeners) {
    listeners = new Set();
    subscribers.set(articleId, listeners);
  }
  listeners.add(onStoreChange);
  return () => {
    const current = subscribers.get(articleId);
    if (!current) return;
    current.delete(onStoreChange);
    if (current.size === 0) {
      subscribers.delete(articleId);
    }
  };
}

function getSnapshot(articleId: string | undefined): number | null {
  if (!articleId) return null;
  const cached = viewCache.get(articleId);
  return typeof cached?.value === 'number' ? cached.value : null;
}

function getServerSnapshot(): number | null {
  return null;
}

export interface UseArticleViewsOptions {
  initial?: number | null;
  refreshIntervalMs?: number;
  initialDelayMs?: number;
  forceInitialFetch?: boolean;
}

export default function useArticleViews(
  articleId: string | undefined,
  {
    initial = null,
    refreshIntervalMs = 0,
    initialDelayMs = 0,
    forceInitialFetch = false,
  }: UseArticleViewsOptions = {},
): number | null {
  const current = useSyncExternalStore(
    (onStoreChange) => (articleId ? subscribe(articleId, onStoreChange) : () => {}),
    () => getSnapshot(articleId),
    getServerSnapshot,
  );

  useEffect(() => {
    if (!articleId || typeof initial !== 'number' || Number.isNaN(initial)) return;
    const cached = viewCache.get(articleId);
    if (!cached || typeof cached.value !== 'number' || cached.value < initial) {
      setCache(articleId, initial);
    }
  }, [articleId, initial]);

  useEffect(() => {
    if (!articleId) return undefined;

    let cancelled = false;
    const run = (force: boolean) => {
      loadViews(articleId, { force }).catch(() => {});
    };

    const timeout = setTimeout(() => {
      if (cancelled) return;
      run(forceInitialFetch);
    }, Math.max(0, initialDelayMs));

    const interval =
      refreshIntervalMs > 0 ? setInterval(() => run(true), refreshIntervalMs) : undefined;

    return () => {
      cancelled = true;
      clearTimeout(timeout);
      if (interval) clearInterval(interval);
    };
  }, [articleId, refreshIntervalMs, initialDelayMs, forceInitialFetch]);

  return typeof current === 'number' ? current : null;
}

export async function refreshArticleViews(articleId: string, options: { force?: boolean } = {}) {
  await loadViews(articleId, options);
}
