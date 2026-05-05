import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

type ArticleImage = {
  photo?: string;
  photoLink?: string;
  altText?: string;
  caption?: string;
};

type ArticleResult = {
  id?: string;
  slug?: string;
  title?: string;
  content?: string;
  category?: string;
  articleType?: string;
  createdDate?: string;
  views?: number;
  keywords?: string[];
  images?: ArticleImage[];
};

type PagedResult = {
  page?: number;
  pageSize?: number;
  total?: number;
  totalPages?: number;
  items?: ArticleResult[];
};

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://server.90stimes.com';

function numberFrom(value: string | number | null | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function stripHtml(value = '') {
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function buildSnippet(article: ArticleResult, query: string) {
  const text = stripHtml(article.content);
  if (!text) return '';

  const tokens = query
    .toLowerCase()
    .split(/\s+/)
    .filter((token) => token.length >= 2);

  const firstHit = tokens
    .map((token) => text.toLowerCase().indexOf(token))
    .filter((index) => index >= 0)
    .sort((a, b) => a - b)[0] ?? 0;

  const start = Math.max(0, firstHit - 90);
  const snippet = text.slice(start, start + 240).trim();
  return `${start > 0 ? '... ' : ''}${snippet}${start + 240 < text.length ? ' ...' : ''}`;
}

function mapFallbackArticle(article: ArticleResult, query: string) {
  return {
    id: article.id || article.slug || article.title || crypto.randomUUID(),
    slug: article.slug ?? '',
    title: article.title ?? 'Untitled archive result',
    snippet: buildSnippet(article, query),
    category: article.category ?? 'Info',
    articleType: article.articleType ?? 'Feature',
    createdDate: article.createdDate,
    score: 0,
    views: article.views ?? 0,
    keywords: Array.isArray(article.keywords) ? article.keywords : [],
    images: Array.isArray(article.images) ? article.images.slice(0, 1) : [],
  };
}

function buildCategoryFacets(items: ArticleResult[]) {
  const counts = new Map<string, number>();
  for (const item of items) {
    const category = item.category || 'Info';
    counts.set(category, (counts.get(category) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([value, count]) => ({ value, label: value, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

function emptyResponse(req: NextRequest) {
  const page = numberFrom(req.nextUrl.searchParams.get('page'), 1);
  const pageSize = numberFrom(req.nextUrl.searchParams.get('pageSize'), 10);
  return {
    query: req.nextUrl.searchParams.get('q') ?? '',
    sort: req.nextUrl.searchParams.get('sort') || 'relevance',
    page,
    pageSize,
    total: 0,
    totalPages: 0,
    items: [],
    categoryFacets: [],
  };
}

async function fetchBackendJson(path: string, qs: string) {
  const res = await fetch(`${API_BASE_URL}${path}${qs}`, {
    cache: 'no-store',
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`Backend search failed with ${res.status}`);
  return res.json();
}

export async function GET(req: NextRequest) {
  const qs = req.nextUrl.search;

  try {
    const smart = await fetchBackendJson('/api/ArticleSearch/smart', qs);
    return NextResponse.json(smart, { status: 200 });
  } catch {
    // Older backend deployments do not know /smart yet; keep search usable.
  }

  try {
    const fallback = (await fetchBackendJson('/api/ArticleSearch/paged', qs)) as PagedResult;
    const items = Array.isArray(fallback.items) ? fallback.items : [];
    const page = numberFrom(fallback.page, numberFrom(req.nextUrl.searchParams.get('page'), 1));
    const pageSize = numberFrom(
      fallback.pageSize,
      numberFrom(req.nextUrl.searchParams.get('pageSize'), 10),
    );
    const total = numberFrom(fallback.total, items.length);

    return NextResponse.json(
      {
        query: req.nextUrl.searchParams.get('q') ?? '',
        sort: req.nextUrl.searchParams.get('sort') || 'relevance',
        page,
        pageSize,
        total,
        totalPages: numberFrom(fallback.totalPages, Math.ceil(total / pageSize)),
        items: items.map((item) => mapFallbackArticle(item, req.nextUrl.searchParams.get('q') ?? '')),
        categoryFacets: buildCategoryFacets(items),
      },
      { status: 200 },
    );
  } catch {
    return NextResponse.json(emptyResponse(req), { status: 200 });
  }
}
