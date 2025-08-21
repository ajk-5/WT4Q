import type { MetadataRoute } from 'next';
import { readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { API_ROUTES } from '@/lib/api';
import { CATEGORIES } from '@/lib/categories';

async function fetchArticlePaths(): Promise<string[]> {
  try {
    const res = await fetch(API_ROUTES.ARTICLE.GET_ALL, { cache: 'no-store' });
    if (!res.ok) return [];
    const articles: { id: string }[] = await res.json();
    return articles.map(a => `/articles/${a.id}`);
  } catch {
    return [];
  }
}

function getCategoryPaths(): string[] {
  return CATEGORIES.map(c => `/category/${encodeURIComponent(c)}`);
}

async function getSubPaths(dir: string): Promise<string[]> {
  try {
    const base = join(process.cwd(), 'src/app', dir);
    const entries = await readdir(base, { withFileTypes: true });
    const paths: string[] = [];
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const files = await readdir(join(base, entry.name));
      if (files.some(f => /^page\.(t|j)sx?$/.test(f))) {
        paths.push(`/${dir}/${entry.name}`);
      }
    }
    return paths;
  } catch {
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.wt4q.com';
  const [articlePaths, categoryPaths, toolPaths, gamePaths] = await Promise.all([
    fetchArticlePaths(),
    getCategoryPaths(),
    getSubPaths('tools'),
    getSubPaths('games'),
  ]);
  const staticPages = [
    '/',
    '/about',
    '/contact',
    '/games',
    '/tools',
    '/search',
    '/terms',
    '/weather',
  ];

  return [
    ...staticPages,
    ...categoryPaths,
    ...articlePaths,
    ...toolPaths,
    ...gamePaths,
  ].map(path => ({
    url: `${siteUrl}${path}`,
  }));
}
