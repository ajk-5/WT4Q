import type { MetadataRoute } from 'next';
import { unstable_cache } from 'next/cache';
import { readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { API_ROUTES } from '@/lib/api';
import { CATEGORIES } from '@/lib/categories';

type ArticleRoute = { path: string; lastModified?: Date };

const loadArticleRoutes = unstable_cache(
  async (): Promise<ArticleRoute[]> => {
    try {
      const res = await fetch(API_ROUTES.ARTICLE.GET_ALL, {
        next: { revalidate: 600 },
      });
      if (!res.ok) return [];
      const articles: { slug: string; createdDate?: string; updatedDate?: string }[] =
        await res.json();
      return articles.map((article) => {
        const candidate = article.updatedDate ?? article.createdDate;
        const time = candidate ? new Date(candidate) : undefined;
        const lastModified =
          time && !Number.isNaN(time.getTime()) ? time : undefined;
        return {
          path: `/articles/${article.slug}`,
          lastModified,
        } satisfies ArticleRoute;
      });
    } catch {
      return [];
    }
  },
  ['sitemap-article-routes'],
  { revalidate: 600 },
);

async function fetchArticlePaths(): Promise<ArticleRoute[]> {
  return loadArticleRoutes();
}

function getCategoryPaths(): string[] {
  return CATEGORIES.map((c) => `/category/${encodeURIComponent(c)}`);
}

async function getSubPaths(dir: string): Promise<string[]> {
  try {
    const base = join(process.cwd(), 'src/app', dir);
    const entries = await readdir(base, { withFileTypes: true });
    const paths: string[] = [];
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const files = await readdir(join(base, entry.name));
      if (files.some((f) => /^page\.(t|j)sx?$/.test(f))) {
        paths.push(`/${dir}/${entry.name}`);
      }
    }
    return paths;
  } catch {
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.90stimes.com';
  const [articleRoutes, categoryPaths, toolPaths, gamePaths] = await Promise.all([
    fetchArticlePaths(),
    getCategoryPaths(),
    getSubPaths('tools'),
    getSubPaths('games'),
  ]);

  const now = new Date();

  const staticEntries: MetadataRoute.Sitemap = [
    {
      url: `${siteUrl}/`,
      changeFrequency: 'hourly',
      priority: 1,
      lastModified: now,
    },
    {
      url: `${siteUrl}/about`,
      changeFrequency: 'yearly',
      priority: 0.6,
      lastModified: now,
    },
    {
      url: `${siteUrl}/contact`,
      changeFrequency: 'yearly',
      priority: 0.5,
      lastModified: now,
    },
    {
      url: `${siteUrl}/games`,
      changeFrequency: 'weekly',
      priority: 0.6,
      lastModified: now,
    },
    {
      url: `${siteUrl}/tools`,
      changeFrequency: 'weekly',
      priority: 0.6,
      lastModified: now,
    },
    {
      url: `${siteUrl}/search`,
      changeFrequency: 'monthly',
      priority: 0.3,
      lastModified: now,
    },
    {
      url: `${siteUrl}/privacy`,
      changeFrequency: 'yearly',
      priority: 0.3,
      lastModified: now,
    },
    {
      url: `${siteUrl}/terms`,
      changeFrequency: 'yearly',
      priority: 0.3,
      lastModified: now,
    },
    {
      url: `${siteUrl}/weather`,
      changeFrequency: 'daily',
      priority: 0.4,
      lastModified: now,
    },
  ];

  const categoryEntries: MetadataRoute.Sitemap = categoryPaths.map((path) => ({
    url: `${siteUrl}${path}`,
    changeFrequency: 'hourly',
    priority: 0.7,
  }));

  const articleEntries: MetadataRoute.Sitemap = articleRoutes.map(({
    path,
    lastModified,
  }) => ({
    url: `${siteUrl}${path}`,
    changeFrequency: 'hourly',
    priority: 0.8,
    lastModified,
  }));

  const toolEntries: MetadataRoute.Sitemap = toolPaths.map((path) => ({
    url: `${siteUrl}${path}`,
    changeFrequency: 'weekly',
    priority: 0.4,
  }));

  const gameEntries: MetadataRoute.Sitemap = gamePaths.map((path) => ({
    url: `${siteUrl}${path}`,
    changeFrequency: 'weekly',
    priority: 0.4,
  }));

  return [
    ...staticEntries,
    ...categoryEntries,
    ...articleEntries,
    ...toolEntries,
    ...gameEntries,
  ];
}
