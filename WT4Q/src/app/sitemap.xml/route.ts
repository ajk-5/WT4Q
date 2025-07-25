import { NextResponse } from 'next/server';
import { API_ROUTES } from '@/lib/api';

export const dynamic = 'force-static';

async function fetchUrls(): Promise<string[]> {
  try {
    const res = await fetch(API_ROUTES.ARTICLE.GET_ALL, { cache: 'no-store' });
    if (!res.ok) return [];
    const articles: { id: string }[] = await res.json();
    return articles.map(a => `/articles/${a.id}`);
  } catch {
    return [];
  }
}

export async function GET() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const articlePaths = await fetchUrls();
  const pages = ['/', '/search', '/terms', '/profile'];
  const urls = [...pages, ...articlePaths];
  const body = `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">` +
    urls.map(p => `\n  <url><loc>${siteUrl}${p}</loc></url>`).join('') +
    '\n</urlset>';
  return new NextResponse(body, {
    headers: { 'Content-Type': 'application/xml' },
  });
}
