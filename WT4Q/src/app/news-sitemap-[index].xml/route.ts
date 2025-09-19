import { chunkArticles, buildNewsXml, fetchRecentArticles, MAX_NEWS_ARTICLES } from '@/lib/news-sitemap';
import type { NextRequest } from 'next/server';
/* eslint-disable @typescript-eslint/no-explicit-any */

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<any> },
): Promise<Response> {
  const { index } = await params;
  const idx = Number(index);
  if (!Number.isInteger(idx)) {
    return new Response('Not found', { status: 404 });
  }
  const articles = await fetchRecentArticles();
  const chunks = chunkArticles(articles, MAX_NEWS_ARTICLES);
  if (idx < 0 || idx >= chunks.length) {
    return new Response('Not found', { status: 404 });
  }
  const body = buildNewsXml(chunks[idx]);
  return new Response(body, {
    headers: { 'Content-Type': 'application/xml' },
  });
}
