import { API_ROUTES } from '@/lib/api';

export interface NewsArticle {
  slug: string;
  title: string;
  createdDate: string;
}

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.wt4q.com';
const PUBLICATION_NAME = 'WT4Q News';
const LANGUAGE = 'en';
export const MAX_NEWS_ARTICLES = 1000;
const MS_48_HOURS = 48 * 60 * 60 * 1000;

export async function fetchRecentArticles(): Promise<NewsArticle[]> {
  try {
    const res = await fetch(API_ROUTES.ARTICLE.GET_ALL, { cache: 'no-store' });
    if (!res.ok) return [];
    const articles: NewsArticle[] = await res.json();
    const cutoff = Date.now() - MS_48_HOURS;
    return articles.filter(a => {
      const time = new Date(a.createdDate).getTime();
      return !Number.isNaN(time) && time >= cutoff;
    });
  } catch {
    return [];
  }
}

export function chunkArticles<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

function escapeXml(value: string): string {
  return value.replace(/[<>&'\"]/g, c => {
    switch (c) {
      case '&':
        return '&amp;';
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case "'":
        return '&apos;';
      case '"':
        return '&quot;';
      default:
        return c;
    }
  });
}

export function buildNewsXml(articles: NewsArticle[]): string {
  const items = articles
    .map(a => {
      const pubDate = new Date(a.createdDate).toISOString();
      return `\n  <url>\n    <loc>${SITE_URL}/articles/${a.slug}</loc>\n    <news:news>\n      <news:publication>\n        <news:name>${PUBLICATION_NAME}</news:name>\n        <news:language>${LANGUAGE}</news:language>\n      </news:publication>\n      <news:publication_date>${pubDate}</news:publication_date>\n      <news:title>${escapeXml(a.title)}</news:title>\n    </news:news>\n  </url>`;
    })
    .join('');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">${items}\n</urlset>`;
}

export function buildNewsIndex(count: number): string {
  const items = Array.from({ length: count }, (_, i) => `\n  <sitemap>\n    <loc>${SITE_URL}/news-sitemap-${i}.xml</loc>\n  </sitemap>`).join('');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${items}\n</sitemapindex>`;
}
