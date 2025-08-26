import { chunkArticles, buildNewsXml, buildNewsIndex, fetchRecentArticles, MAX_NEWS_ARTICLES } from '@/lib/news-sitemap';

export async function GET(): Promise<Response> {
  const articles = await fetchRecentArticles();
  const chunks = chunkArticles(articles, MAX_NEWS_ARTICLES);
  const body = chunks.length === 1 ? buildNewsXml(chunks[0]) : buildNewsIndex(chunks.length);
  return new Response(body, {
    headers: { 'Content-Type': 'application/xml' },
  });
}
