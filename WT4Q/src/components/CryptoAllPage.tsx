"use client";

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './CryptoAllPage.module.css';

type Row = {
  symbol: string;
  lastPrice: number;
  priceChangePercent: number;
  highPrice: number;
  lowPrice: number;
  quoteVolume: number;
  openPrice: number;
};

export default function CryptoAllPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [q, setQ] = useState('');
  const [nameMap, setNameMap] = useState<Record<string, string>>({});
  const router = useRouter();

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch('/api/crypto/tickers?limit=1000');
        if (!res.ok) return;
        const data = (await res.json()) as Row[];
        if (active) setRows(data);
      } catch {}
    })();
    return () => { active = false; };
  }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter((r) => r.symbol.toLowerCase().includes(s));
  }, [q, rows]);

  // Fetch names for visible rows
  useEffect(() => {
    const bases = Array.from(new Set(filtered.map((r) => r.symbol.replace(/USDT$/, '').toUpperCase())));
    if (bases.length === 0) return;
    const chunk = bases.slice(0, 400);
    (async () => {
      try {
        const res = await fetch(`/api/crypto/names?bases=${encodeURIComponent(chunk.join(','))}`);
        if (!res.ok) return;
        const data = (await res.json()) as { base: string; name: string }[];
        setNameMap((prev) => {
          const next = { ...prev };
          for (const d of data) next[d.base.toUpperCase()] = d.name;
          return next;
        });
      } catch {}
    })();
  }, [filtered]);

  return (
    <div className={styles.container}>
      <div className={styles.backRow}>
        <button
          type="button"
          className={styles.backButton}
          onClick={() => {
            if (typeof window !== 'undefined' && document.referrer) {
              try {
                const ref = new URL(document.referrer);
                if (ref.origin === window.location.origin) {
                  router.back();
                  return;
                }
              } catch {}
            }
            router.push('/crypto');
          }}
          aria-label="Go back"
          title="Go back"
        >
          ← Back
        </button>
      </div>
      <h1 className={styles.title}>All cryptocurrencies</h1>
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
          {filtered.map((t) => (
            <tr key={t.symbol} className={styles.row}>
              <td colSpan={5}>
                <button
                  className={styles.rowBtn}
                  onClick={() => router.push(`/crypto/${t.symbol}`)}
                  title={`View ${t.symbol}`}
                >
                  <span className={styles.sym}>{renderDisplayName(t, nameMap)}</span>
                  <span>{formatNumber(t.lastPrice)}</span>
                  <span className={t.priceChangePercent >= 0 ? styles.pos : styles.neg}>
                    {t.priceChangePercent >= 0 ? '▲' : '▼'} {Math.abs(t.priceChangePercent).toFixed(2)}%
                  </span>
                  <span>{renderMiniRange(t)}</span>
                  <span>{formatNumber(t.quoteVolume)}</span>
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function formatNumber(n: number) {
  if (!isFinite(n)) return '-';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(2)}k`;
  if (n >= 1) return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
  return n.toLocaleString(undefined, { maximumFractionDigits: 6 });
}

function renderMiniRange(t: Row) {
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

function renderDisplayName(t: Row, map: Record<string, string>) {
  const base = t.symbol.replace(/USDT$/, '').toUpperCase();
  const n = (map[base] || base).trim();
  return `${n} (${base})`;
}
