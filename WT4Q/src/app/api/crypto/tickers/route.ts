import { NextResponse } from 'next/server';

type BinanceTicker = {
  symbol: string;
  priceChangePercent: string;
  lastPrice: string;
  highPrice: string;
  lowPrice: string;
  volume: string; // base asset volume
  quoteVolume: string; // quote asset volume
  openPrice: string;
  prevClosePrice: string;
};

const BINANCE_TICKER_URL = 'https://api.binance.com/api/v3/ticker/24hr';
const TTL_MS = 10_000;

type TickerItem = {
  symbol: string;
  lastPrice: number;
  priceChangePercent: number;
  highPrice: number;
  lowPrice: number;
  volume: number;
  quoteVolume: number;
  openPrice: number;
  prevClosePrice: number;
};

let memoryCache: { at: number; items: TickerItem[] } | null = null;

function isUsdtSpot(symbol: string): boolean {
  if (!symbol.endsWith('USDT')) return false;
  // Exclude leveraged tokens and oddities
  const bad = ['UPUSDT', 'DOWNUSDT', 'BULLUSDT', 'BEARUSDT'];
  return !bad.some((suf) => symbol.endsWith(suf));
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = Math.max(1, Math.min(1000, Number(searchParams.get('limit')) || 250));

    const now = Date.now();
    let items: TickerItem[] | null = null;

    if (memoryCache && now - memoryCache.at < TTL_MS) {
      items = memoryCache.items;
    } else {
      const res = await fetch(BINANCE_TICKER_URL, { cache: 'no-store' });
      if (!res.ok) {
        if (memoryCache) {
          items = memoryCache.items;
        } else {
          return NextResponse.json({ error: `Upstream error ${res.status}` }, { status: 502 });
        }
      } else {
        const data = (await res.json()) as BinanceTicker[];
        const processed: TickerItem[] = data
          .filter((t) => isUsdtSpot(t.symbol))
          .map((t) => ({
            symbol: t.symbol,
            lastPrice: Number(t.lastPrice),
            priceChangePercent: Number(t.priceChangePercent),
            highPrice: Number(t.highPrice),
            lowPrice: Number(t.lowPrice),
            volume: Number(t.volume),
            quoteVolume: Number(t.quoteVolume),
            openPrice: Number(t.openPrice),
            prevClosePrice: Number(t.prevClosePrice),
          }))
          .sort((a, b) => b.quoteVolume - a.quoteVolume);
        memoryCache = { at: now, items: processed };
        items = processed;
      }
    }

    return NextResponse.json(items!.slice(0, limit), {
      headers: {
        'Cache-Control': `public, max-age=0, s-maxage=${TTL_MS / 1000}, stale-while-revalidate=30`,
        'CDN-Cache-Control': `public, s-maxage=${TTL_MS / 1000}, stale-while-revalidate=30`,
        'Vercel-CDN-Cache-Control': `public, s-maxage=${TTL_MS / 1000}, stale-while-revalidate=30`,
      },
    });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to load tickers' }, { status: 500 });
  }
}
export const revalidate = 10; // seconds
