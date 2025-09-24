"use client";

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import CryptoTicker, { TickerItem } from './CryptoTicker';
import CryptoChart, { Candle } from './CryptoChart';
import styles from './CryptoPage.module.css';

const DEFAULT_SYMBOL = 'BTCUSDT';
const TIMEFRAMES = ['1m', '5m', '1h', '1d', '1w', '1M', '1y'] as const;
type Timeframe = typeof TIMEFRAMES[number];

// Binance miniTicker payload for !miniTicker@arr
type BinanceMiniTicker = {
  s: string; // symbol
  c: string; // close price
  o: string; // open price
  h: string; // high price
  l: string; // low price
  q?: string; // quote volume (optional)
};

export default function CryptoPage() {
  const [tickers, setTickers] = useState<TickerItem[]>([]);
  const [nameMap, setNameMap] = useState<Record<string, string>>({}); // BASE -> name
  const [hasFullList, setHasFullList] = useState(false);
  const [showTopOnly, setShowTopOnly] = useState(true);
  const [symbol, setSymbol] = useState<string>(DEFAULT_SYMBOL);
  const [tf, setTf] = useState<Timeframe>('1h');
  const [candles, setCandles] = useState<Candle[]>([]);
  const [q, setQ] = useState('');

  // Pull top 10 tickers for table by default
  useEffect(() => {
    let active = true;
    const loadTop = async () => {
      try {
        const res = await fetch('/api/crypto/top?limit=10');
        if (!res.ok) return;
        const data = (await res.json()) as TickerItem[];
        if (active) setTickers(data);
      } catch {}
    };
    loadTop();
    const timer = setInterval(loadTop, 20000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, []);

  // Realtime updates for table via Binance miniTicker array stream
  useEffect(() => {
    let ws: WebSocket | null = null;
    try {
      ws = new WebSocket('wss://stream.binance.com:9443/ws/!miniTicker@arr');
      ws.onmessage = (ev) => {
        try {
          const payload = JSON.parse(ev.data) as unknown;
          const arr: BinanceMiniTicker[] | undefined = Array.isArray(payload)
            ? (payload as BinanceMiniTicker[])
            : (payload as { data?: BinanceMiniTicker[] } | undefined)?.data;
          if (!arr || !Array.isArray(arr)) return;
          const map: Record<string, BinanceMiniTicker> = Object.create(null);
          for (const it of arr) {
            if (it && typeof it.s === 'string') map[it.s] = it;
          }
          setTickers((prev) => {
            if (!prev.length) return prev;
            let changed = false;
            const next = prev.map((t) => {
              const u = map[t.symbol];
              if (!u) return t;
              const last = parseFloat(u.c);
              const open = parseFloat(u.o);
              const high = parseFloat(u.h);
              const low = parseFloat(u.l);
              const volQ = parseFloat(u.q ?? '0');
              const pct = open ? ((last - open) / open) * 100 : 0;
              if (
                last !== t.lastPrice ||
                Math.round(pct * 100) !== Math.round(t.priceChangePercent * 100) ||
                high !== t.highPrice || low !== t.lowPrice || volQ !== t.quoteVolume || open !== t.openPrice
              ) {
                changed = true;
                return {
                  ...t,
                  lastPrice: last,
                  priceChangePercent: pct,
                  highPrice: high,
                  lowPrice: low,
                  quoteVolume: volQ,
                  openPrice: open,
                };
              }
              return t;
            });
            return changed ? next : prev;
          });
        } catch {}
      };
    } catch {}
    return () => { try { ws?.close(); } catch {} };
  }, []);

  // When user searches, load full list on demand once
  useEffect(() => {
    const ql = q.trim();
    if (!ql || hasFullList) return;
    let active = true;
    const loadAll = async () => {
      try {
        const res = await fetch('/api/crypto/tickers?limit=1000');
        if (!res.ok) return;
        const data = (await res.json()) as TickerItem[];
        if (active) {
          setTickers(data);
          setHasFullList(true);
          setShowTopOnly(false);
        }
      } catch {}
    };
    const t = setTimeout(loadAll, 150);
    return () => { active = false; clearTimeout(t); };
  }, [q, hasFullList]);

  // Initial symbol pick: prefer BTC, else first entry
  useEffect(() => {
    if (symbol) return;
    const btc = tickers.find((t) => t.symbol === 'BTCUSDT');
    setSymbol(btc?.symbol || tickers[0]?.symbol || DEFAULT_SYMBOL);
  }, [tickers, symbol]);

  // Fetch klines when symbol or timeframe changes
  useEffect(() => {
    if (!symbol) return;
    let active = true;
    const load = async () => {
      try {
        const limit = tf === '1m' ? 1200 : tf === '5m' ? 1200 : tf === '1h' ? 1000 : tf === '1d' ? 700 : tf === '1w' ? 800 : tf === '1M' ? 600 : 365;
        const res = await fetch(`/api/crypto/klines?symbol=${symbol}&interval=${tf}&limit=${limit}`);
        if (!res.ok) return;
        const data = (await res.json()) as Candle[];
        if (active) setCandles(data);
      } catch {}
    };
    load();
    return () => { active = false; };
  }, [symbol, tf]);

  const filtered = useMemo(() => {
    const ql = q.trim().toLowerCase();
    const base = ql ? tickers : (showTopOnly ? tickers.slice(0, 10) : tickers);
    if (!ql) return base;
    return base.filter((t) => t.symbol.toLowerCase().includes(ql));
  }, [q, tickers, showTopOnly]);

  // Enrich names for visible rows if missing
  useEffect(() => {
    const need = filtered
      .filter((t) => !t.name)
      .map((t) => t.symbol.replace(/USDT$/, ''));
    const unique = Array.from(new Set(need));
    if (unique.length === 0) return;
    const bases = unique.slice(0, 300); // cap to keep URL small
    (async () => {
      try {
        const res = await fetch(`/api/crypto/names?bases=${encodeURIComponent(bases.join(','))}`);
        if (!res.ok) return;
        const rows = (await res.json()) as { base: string; name: string }[];
        setNameMap((prev) => {
          const next = { ...prev };
          for (const r of rows) next[r.base.toUpperCase()] = r.name;
          return next;
        });
      } catch {}
    })();
  }, [filtered]);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Crypto Markets</h1>
        <div className={styles.subtle}>Live quotes from Binance • Click any asset to view chart</div>
      </div>

      <CryptoTicker onSelect={(s) => setSymbol(s)} />

      <div className={styles.grid}>
        <section className={styles.card}>
          <div className={styles.toolbar}>
            <strong className={styles.sym}>{prettySymbol(symbol)}</strong>
            {(() => {
              const sel = tickers.find((t) => t.symbol === symbol);
              const change = sel?.priceChangePercent;
              if (typeof change !== 'number' || !isFinite(change)) return null;
              const up = change >= 0;
              const pct = Math.abs(change).toFixed(2) + '%';
              return (
                <span className={`${up ? styles.pos : styles.neg} ${styles.change}`.trim()} aria-live="polite">
                  {up ? (
                    <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" className={styles.changeIcon}>
                      <path fill="currentColor" d="M12 4l6 6h-4v6h-4v-6H6z" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" className={styles.changeIcon}>
                      <path fill="currentColor" d="M12 20l-6-6h4V8h4v6h4z" />
                    </svg>
                  )}
                  {pct}
                </span>
              );
            })()}
            {TIMEFRAMES.map((k) => (
              <button
                key={k}
                type="button"
                className={`${styles.btn} ${tf === k ? styles.btnActive : ''}`}
                onClick={() => setTf(k)}
              >
                {k}
              </button>
            ))}
          </div>
          <CryptoChart data={candles} symbol={symbol} interval={tf} className={styles.chart} />
        </section>

        <aside className={`${styles.card} ${styles.tableWrap}`}>
          <div className={styles.actions}>
            <button
              className={`${styles.btn} ${showTopOnly ? styles.btnActive : ''}`}
              onClick={() => setShowTopOnly(true)}
              title="Show top 10 by volume"
            >
              Top 10
            </button>
            <Link
              className={`${styles.btn} ${!showTopOnly ? styles.btnActive : ''}`}
              href="/crypto/all"
              title="Open the full list"
            >
              Show all
            </Link>
            <span className={styles.muted}>{showTopOnly ? 'Showing top 10 by volume' : `Showing ${tickers.length} coins`}</span>
          </div>
          <div className={styles.searchRow}>
            <input
              className={styles.searchInput}
              placeholder="Search (e.g., BTC, ETHUSDT)"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <table className={styles.table}>
            <thead className={styles.thead}>
              <tr>
                <th>Symbol</th>
                <th>Price</th>
                <th>24h</th>
                <th>High/Low</th>
                <th>Volume (Quote)</th>
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, showTopOnly && !q ? 10 : 500).map((t) => (
                <tr key={t.symbol} className={styles.row}>
                  <td colSpan={5}>
                    <button className={styles.rowBtn} onClick={() => setSymbol(t.symbol)} title={`View ${t.symbol} chart`}>
                      <span className={styles.sym}>{renderDisplayName(t, nameMap)}</span>
                      <span>{formatNumber(t.lastPrice)}</span>
                      <span className={t.priceChangePercent >= 0 ? styles.pos : styles.neg}>
                        {t.priceChangePercent >= 0 ? '▲' : '▼'} {Math.abs(t.priceChangePercent).toFixed(2)}%
                      </span>
                      <span>
                        {renderMiniRange(t)}
                      </span>
                      <span>{formatNumber(t.quoteVolume)}</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </aside>
      </div>
    </div>
  );
}

function prettySymbol(s: string) {
  return s.replace('USDT', '/USDT');
}

function formatNumber(n: number) {
  if (!isFinite(n)) return '-';
  if (n >= 1000000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(2)}k`;
  if (n >= 1) return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
  return n.toLocaleString(undefined, { maximumFractionDigits: 6 });
}

function renderMiniRange(t: TickerItem) {
  const low = t.lowPrice;
  const high = t.highPrice;
  const cur = t.lastPrice;
  const open = t.openPrice;
  if (!isFinite(low) || !isFinite(high) || high <= low) return null;
  const span = high - low;
  const pos = Math.max(0, Math.min(1, (cur - low) / span));
  const widthPct = `${Math.min(100, Math.max(0, ((Math.max(cur, open) - low) / span) * 100))}%`;
  const dirUp = cur >= open;
  return (
    <div className={styles.miniRange} aria-hidden>
      <span className={`${styles.miniFill} ${dirUp ? styles.miniFillUp : styles.miniFillDown}`} style={{ width: widthPct }} />
      <span className={styles.miniMarker} style={{ left: `${pos * 100}%` }} />
    </div>
  );
}

function renderDisplayName(t: TickerItem, map: Record<string, string>) {
  const base = t.symbol.replace(/USDT$/, '').toUpperCase();
  const n = (t.name || map[base] || base).trim();
  return `${n} (${base})`;
}
