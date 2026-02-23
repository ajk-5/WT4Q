import type { MetadataRoute } from 'next';
import { API_ROUTES } from '@/lib/api';
import { slugify } from '@/lib/text';
import { canonicalFor } from '@/lib/seo';

export const runtime = 'edge';
export const revalidate = 3600; // regenerate every hour

type CocktailItem = {
  id?: number;
  name?: string | null;
};

async function fetchAllCocktails(): Promise<CocktailItem[]> {
  try {
    const res = await fetch(API_ROUTES.COCKTAIL.GET_ALL, { cache: 'no-store' });
    if (!res.ok) return [];
    const data = (await res.json()) as CocktailItem[] | null;
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const cocktails = await fetchAllCocktails();

  const entries: MetadataRoute.Sitemap = [
    {
      url: canonicalFor('/bar'),
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: canonicalFor('/bar/games'),
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.7,
    },
    {
      url: canonicalFor('/bar/wheel-of-fortune'),
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.7,
    },
  ];

  for (const cocktail of cocktails) {
    if (!cocktail?.id) continue;
    const slugPart = slugify(cocktail.name || '');
    const path =
      slugPart && slugPart.length > 0
        ? `/bar/cocktails/${cocktail.id}-${slugPart}`
        : `/bar/cocktails/${cocktail.id}`;

    entries.push({
      url: canonicalFor(path),
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.6,
    });
  }

  return entries;
}
