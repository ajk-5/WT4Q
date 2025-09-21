import { NextResponse } from 'next/server';

const FEED = (q: string) =>
  `https://news.google.com/rss/search?q=${encodeURIComponent(q)}%20when:7d&hl=en-US&gl=US&ceid=US:en`;

const TTL_MS = 10 * 60 * 1000; // 10 minutes

type RssItem = {
  title?: string;
  link?: string;
  pubDate?: string;
  source?: string;
  description?: string;
};

const cache: Record<string, { at: number; items: RssItem[] }> = {};

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get('q') || '').trim();
    if (!q) return NextResponse.json({ error: 'q required' }, { status: 400 });
    const now = Date.now();
    const key = q.toLowerCase();
    if (cache[key] && now - cache[key].at < TTL_MS) {
      return NextResponse.json(cache[key].items, { headers: cacheHeaders(TTL_MS) });
    }
    const res = await fetch(FEED(q), { cache: 'no-store' });
    if (!res.ok) return NextResponse.json({ error: 'feed error' }, { status: 502 });
    const xml = await res.text();
    const items = parseRssItems(xml).slice(0, 40);
    cache[key] = { at: now, items };
    return NextResponse.json(items, { headers: cacheHeaders(TTL_MS) });
  } catch {
    return NextResponse.json({ error: 'failed' }, { status: 500 });
  }
}

function parse(tag: string, src: string): string[] {
  const out: string[] = [];
  const re = new RegExp(`<${tag}[^>]*>([\s\S]*?)<\/${tag}>`, 'gi');
  let m: RegExpExecArray | null;
  while ((m = re.exec(src))) out.push(decodeHtml(m[1].trim()));
  return out;
}

function decodeHtml(s: string) {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function parseRssItems(xml: string) {
  const blocks = xml.split(/<item>/i).slice(1).map((b) => b.split(/<\/item>/i)[0]);
  return blocks.map((b) => {
    const [title] = parse('title', b);
    const [link] = parse('link', b);
    const [pubDate] = parse('pubDate', b);
    const [source] = parse('source', b);
    const [description] = parse('description', b);
    return { title, link, pubDate, source, description };
  });
}

function cacheHeaders(ttlMs: number) {
  const ttl = Math.max(1, Math.floor(ttlMs / 1000));
  const swr = Math.max(60, ttl * 3);
  return {
    'Cache-Control': `public, max-age=0, s-maxage=${ttl}, stale-while-revalidate=${swr}`,
    'CDN-Cache-Control': `public, s-maxage=${ttl}, stale-while-revalidate=${swr}`,
    'Vercel-CDN-Cache-Control': `public, s-maxage=${ttl}, stale-while-revalidate=${swr}`,
  } as Record<string, string>;
}

export const revalidate = 0;
