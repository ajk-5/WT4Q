import { NextResponse } from 'next/server';

// Binance klines API returns arrays per candle
// [ openTime, open, high, low, close, volume, closeTime, ... ]

const BINANCE_KLINES_URL = 'https://api.binance.com/api/v3/klines';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const symbol = searchParams.get('symbol') || 'BTCUSDT';
    const interval = (searchParams.get('interval') || '1h').toLowerCase();
    const startTime = searchParams.get('startTime');
    const endTime = searchParams.get('endTime');
    let limit = Math.max(1, Math.min(1500, Number(searchParams.get('limit')) || 500));

    // Map custom '1y' to daily candles for last 365 days
    let upstreamInterval = interval as string;
    if (interval === '1y') {
      upstreamInterval = '1d';
      limit = Math.max(limit, 365);
    }

    const qs = new URLSearchParams({ symbol, interval: upstreamInterval, limit: String(limit) });
    if (startTime) qs.set('startTime', startTime);
    if (endTime) qs.set('endTime', endTime);

    const url = `${BINANCE_KLINES_URL}?${qs.toString()}`;
    const ttl = ttlForInterval(interval);
    const res = await fetch(url, { next: { revalidate: ttl } });
    if (!res.ok) {
      return NextResponse.json({ error: `Upstream error ${res.status}` }, { status: 502 });
    }
    const raw = (await res.json()) as unknown[];
    const candles = (raw as any[]).map((c) => ({
      time: Math.floor(Number(c[0]) / 1000),
      open: Number(c[1]),
      high: Number(c[2]),
      low: Number(c[3]),
      close: Number(c[4]),
      volume: Number(c[5]),
    }));

    return NextResponse.json(candles, {
      headers: {
        'Cache-Control': `public, max-age=0, s-maxage=${ttl}, stale-while-revalidate=${Math.max(2 * ttl, 60)}`,
        'CDN-Cache-Control': `public, s-maxage=${ttl}, stale-while-revalidate=${Math.max(2 * ttl, 60)}`,
        'Vercel-CDN-Cache-Control': `public, s-maxage=${ttl}, stale-while-revalidate=${Math.max(2 * ttl, 60)}`,
      },
    });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to load klines' }, { status: 500 });
  }
}

function ttlForInterval(interval: string): number {
  switch (interval) {
    case '1m':
      return 10;
    case '5m':
      return 20;
    case '1h':
      return 60 * 5; // 5 minutes
    case '1d':
      return 60 * 30; // 30 minutes
    case '1w':
      return 60 * 60; // 1 hour
    case '1M':
    case '1y':
      return 60 * 60 * 6; // 6 hours
    default:
      return 60; // sensible default
  }
}
export const dynamic = 'force-dynamic';
