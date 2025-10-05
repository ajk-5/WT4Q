import { chunkArticles, buildNewsXml, fetchRecentArticles, MAX_NEWS_ARTICLES } from '@/lib/news-sitemap';
import type { NextRequest } from 'next/server';

// Alias for /news-sitemap-[index].xml to support clients requesting /newssitemap-<index>.xml
export const revalidate = 300;

type RouteParams = Record<string, string>;

export async function GET(
  _req: NextRequest,
  context: { params: Promise<RouteParams> },
): Promise<Response> {
  const resolved = context?.params ? await context.params : undefined;
  const idx = Number(resolved?.index ?? Number.NaN);
  if (!Number.isInteger(idx) || idx < 0) {
    return new Response('Not found', { status: 404 });
  }
  const articles = await fetchRecentArticles();
  const chunks = chunkArticles(articles, MAX_NEWS_ARTICLES);
  if (idx >= chunks.length) {
    return new Response('Not found', { status: 404 });
  }
  const body = buildNewsXml(chunks[idx]);
  return new Response(body, {
    headers: { 'Content-Type': 'application/xml' },
  });
}
