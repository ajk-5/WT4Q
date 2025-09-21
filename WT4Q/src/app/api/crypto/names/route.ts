import { NextResponse } from 'next/server';

type CGCoin = { id: string; symbol: string; name: string };

const LIST_URL = 'https://api.coingecko.com/api/v3/coins/list?include_platform=false';
const TTL_MS = 24 * 60 * 60 * 1000; // 24h

let cache: { at: number; map: Map<string, string> } | null = null;

async function loadMap(): Promise<Map<string, string>> {
  const now = Date.now();
  if (cache && now - cache.at < TTL_MS) return cache.map;
  const res = await fetch(LIST_URL, { cache: 'no-store' });
  if (!res.ok) throw new Error(`coins/list HTTP ${res.status}`);
  const list = (await res.json()) as CGCoin[];
  // Prefer the first seen name per symbol (CoinGecko roughly ordered by id)
  const m = new Map<string, string>();
  for (const c of list) {
    const key = (c.symbol || '').toUpperCase();
    if (!key || m.has(key)) continue;
    m.set(key, c.name);
  }
  cache = { at: now, map: m };
  return m;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const basesParam = (searchParams.get('bases') || '').trim();
    if (!basesParam) return NextResponse.json([], { status: 200 });
    const bases = Array.from(new Set(basesParam.split(',').map((s) => s.trim().toUpperCase()).filter(Boolean)));
    const map = await loadMap();
    const out = bases.map((b) => ({ base: b, name: map.get(b) || b }));
    const ttl = Math.floor(TTL_MS / 1000);
    return NextResponse.json(out, {
      headers: {
        'Cache-Control': `public, max-age=0, s-maxage=${ttl}, stale-while-revalidate=${ttl}`,
      },
    });
  } catch (e) {
    return NextResponse.json([], { status: 200 });
  }
}

export const revalidate = 0;

