"use client";

import { useEffect, useMemo, useState } from 'react';
import CryptoTicker, { TickerItem } from './CryptoTicker';
import CryptoChart, { Candle } from './CryptoChart';
import styles from './CryptoPage.module.css';

const DEFAULT_SYMBOL = 'BTCUSDT';
const TIMEFRAMES = ['1m', '5m', '1h', '1d', '1w', '1M', '1y'] as const;
type Timeframe = typeof TIMEFRAMES[number];

export default function CryptoPage() {
  const [tickers, setTickers] = useState<TickerItem[]>([]);
  const [nameMap, setNameMap] = useState<Record<string, string>>({}); // BASE -> name
  const [hasFullList, setHasFullList] = useState(false);
  const [showTopOnly, setShowTopOnly] = useState(true);
  const [symbol, setSymbol] = useState<string>(DEFAULT_SYMBOL);
  const [tf, setTf] = useState<Timeframe>('1h');
  const [candles, setCandles] = useState<Candle[]>([]);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(false);

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
    setLoading(true);
    const load = async () => {
      try {
        const limit = tf === '1m' ? 1200 : tf === '5m' ? 1200 : tf === '1h' ? 1000 : tf === '1d' ? 700 : tf === '1w' ? 800 : tf === '1M' ? 600 : 365;
        const res = await fetch(`/api/crypto/klines?symbol=${symbol}&interval=${tf}&limit=${limit}`);
        if (!res.ok) return;
        const data = (await res.json()) as Candle[];
        if (active) setCandles(data);
      } catch {}
      finally {
        if (active) setLoading(false);
      }
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
            <strong>{prettySymbol(symbol)}</strong>
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
            <a
              className={`${styles.btn} ${!showTopOnly ? styles.btnActive : ''}`}
              href="/crypto/all"
              title="Open the full list"
            >
              Show all
            </a>
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

function renderName(t: TickerItem, map: Record<string, string>) {
  const base = t.symbol.replace(/USDT$/, '').toUpperCase();
  const n = t.name || map[base];
  return n ? ` (${n})` : '';
}

function renderDisplayName(t: TickerItem, map: Record<string, string>) {
  const base = t.symbol.replace(/USDT$/, '').toUpperCase();
  const n = (t.name || map[base] || base).trim();
  return `${n} (${base})`;
}
