import type { MetadataRoute } from 'next';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.90stimes.com';

export const revalidate = 3600; // regenerate every hour

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const abs = (path: string) => new URL(path, siteUrl).toString();
  const now = new Date();

  const entries: MetadataRoute.Sitemap = [
    {
      url: abs('/crypto'),
      lastModified: now,
      changeFrequency: 'hourly',
      priority: 0.9,
    },
    {
      url: abs('/crypto/all'),
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.7,
    },
  ];

  try {
    // Include a good set of symbols without making the XML too large
    const res = await fetch(abs('/api/crypto/tickers?limit=300'), { next: { revalidate: 3600 } });
    if (res.ok) {
      const data = (await res.json()) as { symbol: string }[];
      for (const { symbol } of data) {
        entries.push({
          url: abs(`/crypto/${symbol}`),
          lastModified: now,
          changeFrequency: 'hourly',
          priority: 0.6,
        });
      }
    }
  } catch {
    // ignore; return base entries
  }

  return entries;
}

