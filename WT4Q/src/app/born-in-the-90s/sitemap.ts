import type { MetadataRoute } from 'next';
import { API_ROUTES } from '@/lib/api';
import { canonicalFor } from '@/lib/seo';
import { VAULT_BASE } from '@/lib/vaultPaths';

export const runtime = 'edge';
export const revalidate = 3600; // regenerate every hour

type ShowItem = {
  slug?: string;
  kind?: string;
  createdAt?: string;
};

type QuizItem = {
  slug?: string;
  createdAt?: string;
};

async function fetchAllShows(): Promise<ShowItem[]> {
  const out: ShowItem[] = [];
  const pageSize = 100;

  for (let page = 1; page <= 20; page++) {
    try {
      const url = API_ROUTES.SHOW.LIST('', '', page, pageSize);
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) break;

      const payload = (await res.json()) as { items?: ShowItem[] } | ShowItem[] | null;
      const items = Array.isArray(payload)
        ? payload
        : payload && Array.isArray(payload.items)
          ? payload.items
          : [];

      if (!items.length) break;
      out.push(...items);
      if (items.length < pageSize) break;
    } catch {
      break;
    }
  }

  return out;
}

async function fetchAllQuizzes(): Promise<QuizItem[]> {
  try {
    const res = await fetch(API_ROUTES.QUIZ.LIST(false), { cache: 'no-store' });
    if (!res.ok) return [];
    const data = (await res.json()) as QuizItem[] | null;
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const [shows, quizzes] = await Promise.all([fetchAllShows(), fetchAllQuizzes()]);

  const entries: MetadataRoute.Sitemap = [
    {
      url: canonicalFor(VAULT_BASE),
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.9,
    },
  ];

  for (const show of shows) {
    if (!show.slug || !show.kind) continue;
    const kindSegment = show.kind.toUpperCase();
    entries.push({
      url: canonicalFor(
        `${VAULT_BASE}/${encodeURIComponent(kindSegment)}/${encodeURIComponent(show.slug)}`,
      ),
      lastModified: show.createdAt ? new Date(show.createdAt) : undefined,
      changeFrequency: 'weekly',
      priority: 0.7,
    });
  }

  for (const quiz of quizzes) {
    if (!quiz.slug) continue;
    entries.push({
      url: canonicalFor(`${VAULT_BASE}/${encodeURIComponent(quiz.slug)}`),
      lastModified: quiz.createdAt ? new Date(quiz.createdAt) : undefined,
      changeFrequency: 'weekly',
      priority: 0.7,
    });
  }

  return entries;
}
