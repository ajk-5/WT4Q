import { NextResponse } from 'next/server';

type CGCoin = {
  id: string;
  symbol: string; // lowercase, e.g., 'btc'
  name: string;
  current_price: number;
  market_cap: number;
  market_cap_rank: number | null;
  high_24h: number | null;
  low_24h: number | null;
  total_volume: number; // quote vol (USD)
  price_change_percentage_24h: number | null;
};

type BinanceExchangeInfo = {
  symbols: { symbol: string; status: string; baseAsset: string; quoteAsset: string }[];
};

const CG_MARKETS =
  'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=60&page=1&price_change_percentage=24h';
const BINANCE_EXCHANGE_INFO = 'https://api.binance.com/api/v3/exchangeInfo';

const EX_INFO_TTL_MS = 60 * 60 * 1000; // 1 hour
const TOP_TTL_MS = 60 * 1000; // 60 seconds

const STABLES = new Set([
  'USDT',
  'USDC',
  'FDUSD',
  'BUSD',
  'TUSD',
  'DAI',
  'USDD',
  'USDP',
  'UST',
  'USTC',
]);

let exInfoCache: { at: number; usdtPairs: Set<string> } | null = null;
let topCache: { at: number; items: any[] } | null = null;

async function getUsdtPairs(): Promise<Set<string>> {
  const now = Date.now();
  if (exInfoCache && now - exInfoCache.at < EX_INFO_TTL_MS) return exInfoCache.usdtPairs;
  const res = await fetch(BINANCE_EXCHANGE_INFO, { cache: 'no-store' });
  if (!res.ok) throw new Error(`exchangeInfo HTTP ${res.status}`);
  const info = (await res.json()) as BinanceExchangeInfo;
  const set = new Set(
    info.symbols
      .filter((s) => s.status === 'TRADING' && s.quoteAsset === 'USDT')
      .map((s) => s.symbol),
  );
  exInfoCache = { at: now, usdtPairs: set };
  return set;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = Math.max(1, Math.min(50, Number(searchParams.get('limit')) || 10));
    const now = Date.now();
    if (topCache && now - topCache.at < TOP_TTL_MS) {
      return NextResponse.json(topCache.items.slice(0, limit), {
        headers: cacheHeaders(TOP_TTL_MS),
      });
    }

    const [usdtPairs, cgRes] = await Promise.all([
      getUsdtPairs(),
      fetch(CG_MARKETS, { cache: 'no-store' }),
    ]);
    if (!cgRes.ok) return NextResponse.json({ error: 'coingecko error' }, { status: 502 });
    const coins = (await cgRes.json()) as CGCoin[];

    const items: any[] = [];
    for (const c of coins) {
      const base = c.symbol.toUpperCase().replace(/[^A-Z0-9]/g, '');
      if (STABLES.has(base)) continue;
      const sym = `${base}USDT`;
      if (!usdtPairs.has(sym)) continue;
      items.push({
        symbol: sym,
        lastPrice: c.current_price,
        priceChangePercent: c.price_change_percentage_24h ?? 0,
        highPrice: c.high_24h ?? c.current_price,
        lowPrice: c.low_24h ?? c.current_price,
        volume: 0,
        quoteVolume: c.total_volume,
        openPrice: computeOpen(c.current_price, c.price_change_percentage_24h ?? 0),
        prevClosePrice: computeOpen(c.current_price, c.price_change_percentage_24h ?? 0),
        name: c.name,
        marketCap: c.market_cap,
        marketCapRank: c.market_cap_rank,
      });
      if (items.length >= limit) break;
    }

    topCache = { at: now, items };
    return NextResponse.json(items.slice(0, limit), { headers: cacheHeaders(TOP_TTL_MS) });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to load top list' }, { status: 500 });
  }
}

function computeOpen(last: number, pct: number) {
  const f = 1 + pct / 100;
  return f !== 0 ? last / f : last;
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

