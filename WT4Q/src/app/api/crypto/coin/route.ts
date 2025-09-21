import { NextResponse } from 'next/server';

const SEARCH_URL = 'https://api.coingecko.com/api/v3/search';
const COIN_URL = (id: string) => `https://api.coingecko.com/api/v3/coins/${encodeURIComponent(id)}?localization=false&tickers=false&market_data=true&community_data=true&developer_data=true&sparkline=false`;

type SearchResult = {
  coins: { id: string; name: string; symbol: string }[];
};

type CoinResponse = {
  id: string;
  name: string;
  symbol?: string;
  image: string | null;
  homepage: string | null;
  description: string | null;
  rank: number | null;
  categories: string[];
  links: { website: string | null; twitter: string | null; reddit: string | null; github: string[]; explorers: string[] };
  marketCap: number | null;
  fdv: number | null;
  currentPrice: number | null;
  totalVolume: number | null;
  high24h: number | null;
  low24h: number | null;
  ath: number | null;
  athDate: string | null;
  atl: number | null;
  atlDate: string | null;
  supply: { circulating: number | null; total: number | null; max: number | null };
  priceChange1h: number | null;
  priceChange24h: number | null;
  priceChange7d: number | null;
  priceChange30d: number | null;
  priceChange1y: number | null;
  lastUpdated: string | null;
};

const cache: Record<string, { at: number; data: CoinResponse }> = {};
const TTL_MS = 120_000;

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const base = (searchParams.get('base') || '').trim().toLowerCase();
    if (!base) return NextResponse.json({ error: 'base required' }, { status: 400 });
    const now = Date.now();
    const key = base;
    if (cache[key] && now - cache[key].at < TTL_MS) {
      return NextResponse.json(cache[key].data, { headers: cacheHeaders(TTL_MS) });
    }

    const sres = await fetch(`${SEARCH_URL}?query=${encodeURIComponent(base)}`, { cache: 'no-store' });
    if (!sres.ok) return NextResponse.json({ error: 'search failed' }, { status: 502 });
    const sjson = (await sres.json()) as SearchResult;
    const match = sjson.coins.find((c) => c.symbol.toLowerCase() === base) || sjson.coins[0];
    if (!match) return NextResponse.json({ error: 'not found' }, { status: 404 });

    const cres = await fetch(COIN_URL(match.id), { cache: 'no-store' });
    if (!cres.ok) return NextResponse.json({ error: 'coin failed' }, { status: 502 });
    const cjson = await cres.json();

    const md = cjson.market_data || {};
    const links = cjson.links || {};
    const out: CoinResponse = {
      id: cjson.id,
      name: cjson.name,
      symbol: cjson.symbol?.toUpperCase(),
      image: cjson.image?.large || cjson.image?.small || cjson.image?.thumb || null,
      homepage: links?.homepage?.[0] || null,
      description: (cjson.description?.en as string | undefined)?.split('\n')?.filter(Boolean)?.slice(0, 3).join(' ') || null,
      rank: cjson.market_cap_rank ?? null,
      categories: Array.isArray(cjson.categories) ? (cjson.categories as string[]).slice(0, 6) : [],
      links: {
        website: links?.homepage?.[0] || null,
        twitter: links?.twitter_screen_name ? `https://twitter.com/${links.twitter_screen_name}` : null,
        reddit: links?.subreddit_url || null,
        github: Array.isArray(links?.repos_url?.github) ? links.repos_url.github.slice(0, 2) : [],
        explorers: Array.isArray(links?.blockchain_site) ? (links.blockchain_site as string[]).filter(Boolean).slice(0, 3) : [],
      },
      marketCap: md.market_cap?.usd ?? null,
      fdv: md.fully_diluted_valuation?.usd ?? null,
      currentPrice: md.current_price?.usd ?? null,
      totalVolume: md.total_volume?.usd ?? null,
      high24h: md.high_24h?.usd ?? null,
      low24h: md.low_24h?.usd ?? null,
      ath: md.ath?.usd ?? null,
      athDate: md.ath_date?.usd ?? null,
      atl: md.atl?.usd ?? null,
      atlDate: md.atl_date?.usd ?? null,
      supply: {
        circulating: md.circulating_supply ?? null,
        total: md.total_supply ?? null,
        max: md.max_supply ?? null,
      },
      priceChange1h: md.price_change_percentage_1h_in_currency?.usd ?? null,
      priceChange24h: md.price_change_percentage_24h_in_currency?.usd ?? (md.price_change_percentage_24h ?? null),
      priceChange7d: md.price_change_percentage_7d_in_currency?.usd ?? null,
      priceChange30d: md.price_change_percentage_30d_in_currency?.usd ?? null,
      priceChange1y: md.price_change_percentage_1y_in_currency?.usd ?? null,
      lastUpdated: cjson.last_updated ?? null,
    };

    cache[key] = { at: now, data: out };
    return NextResponse.json(out, { headers: cacheHeaders(TTL_MS) });
  } catch {
    return NextResponse.json({ error: 'failed' }, { status: 500 });
  }
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
