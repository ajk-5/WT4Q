import type { MetadataRoute } from 'next';
import { unstable_cache } from 'next/cache';
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

// Removed tools/games discovery; no longer part of the site

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.90stimes.com';
  const [articleRoutes, categoryPaths] = await Promise.all([
    fetchArticlePaths(),
    getCategoryPaths(),
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
    // Games and Tools removed from sitemap
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

  // No tool/game entries

  return [
    ...staticEntries,
    ...categoryEntries,
    ...articleEntries,
  ];
}
