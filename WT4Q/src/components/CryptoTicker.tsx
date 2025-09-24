"use client";

import { useEffect, useMemo, useRef, useState } from 'react';
import styles from './CryptoTicker.module.css';

export type TickerItem = {
  symbol: string;
  lastPrice: number;
  priceChangePercent: number;
  highPrice: number;
  lowPrice: number;
  openPrice: number;
  quoteVolume: number;
  name?: string; // optional human-readable name
};

type Props = {
  onSelect?: (symbol: string) => void;
  className?: string;
};

const FETCH_MS = 12000; // refresh every ~12s

export default function CryptoTicker({ onSelect, className }: Props) {
  const [tickers, setTickers] = useState<TickerItem[]>([]);
  const trackRef = useRef<HTMLDivElement>(null);
  const [duration, setDuration] = useState(40); // seconds for one loop

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const res = await fetch('/api/crypto/top?limit=10');
        if (!res.ok) return;
        const data = (await res.json()) as TickerItem[];
        if (active) setTickers(data);
      } catch {}
    };
    load();
    const timer = setInterval(load, FETCH_MS);

    // Realtime updates for displayed symbols using Binance all-mini-tickers stream
    let ws: WebSocket | null = null;
    try {
      ws = new WebSocket('wss://stream.binance.com:9443/ws/!miniTicker@arr');
      type MiniTicker = { s: string; c: string; o: string; h: string; l: string; q?: string };
      ws.onmessage = (ev) => {
        try {
          const payload = JSON.parse(ev.data) as unknown;
          const arr: MiniTicker[] | undefined = Array.isArray(payload)
            ? (payload as MiniTicker[])
            : (payload as { data?: MiniTicker[] } | undefined)?.data;
          if (!arr || !Array.isArray(arr)) return;
          setTickers((prev) => {
            if (!prev.length) return prev;
            const map: Record<string, MiniTicker> = Object.create(null);
            for (const it of arr) {
              if (it && typeof it.s === 'string') map[it.s] = it;
            }
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

    return () => {
      active = false;
      clearInterval(timer);
      try { ws?.close(); } catch {}
    };
  }, []);

  // Duplicate list for seamless loop
  const loopItems = useMemo(() => tickers.concat(tickers), [tickers]);

  // Adjust animation duration based on content width
  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    const width = el.scrollWidth / 2; // one set width
    // Speed ~ 140px/s; ensure min 20s to keep readable
    const computed = Math.max(20, Math.round(width / 140));
    setDuration(computed);
  }, [tickers.length]);

  return (
    <div className={`${styles.wrapper}${className ? ` ${className}` : ''}`} role="region" aria-label="Live crypto prices">
      <div className={styles.viewport}>
        <div
          ref={trackRef}
          className={styles.track}
          style={{ animationDuration: `${duration}s` }}
        >
          {loopItems.map((t, i) => (
            <span key={`${t.symbol}-${i}`} style={{ display: 'inline-flex', alignItems: 'center' }}>
              <button
                type="button"
                className={styles.item}
                onClick={() => onSelect?.(t.symbol)}
                title={`${displayName(t)} • ${formatNumber(t.lastPrice)} (${t.priceChangePercent.toFixed(2)}%)`}
              >
                <span className={styles.symbol}>{displayName(t)}</span>
                <span className={styles.price}>{formatNumber(t.lastPrice)}</span>
                <span className={t.priceChangePercent >= 0 ? styles.changeUp : styles.changeDown}>
                  {t.priceChangePercent >= 0 ? '▲' : '▼'} {Math.abs(t.priceChangePercent).toFixed(2)}%
                </span>
                <span className={styles.range} aria-hidden>
                  {renderRange(t)}
                </span>
              </button>
              <span className={styles.separator} aria-hidden />
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

/*function prettySymbol(s: string) {
  return s.replace('USDT', '/USDT');
}*/

function formatNumber(n: number) {
  if (n === 0) return '0';
  if (n >= 1000) return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
  // dynamic decimals for small prices
  const decimals = n < 1 ? 6 : 4;
  return n.toLocaleString(undefined, { maximumFractionDigits: decimals });
}

function renderRange(t: TickerItem) {
  const { lowPrice: low, highPrice: high, lastPrice: last, openPrice: open } = t;
  if (!isFinite(low) || !isFinite(high) || high <= low) return null;
  const span = high - low;
  const pos = Math.max(0, Math.min(1, (last - low) / span));
  const widthPct = `${Math.min(100, Math.max(0, ((Math.max(last, open) - low) / span) * 100))}%`;
  const dirUp = last >= open;
  return (
    <>
      <span
        className={`${styles.rangeFill} ${dirUp ? styles.rangeFillUp : styles.rangeFillDown}`}
        style={{ width: widthPct }}
      />
      <span className={styles.marker} style={{ left: `${pos * 100}%` }} />
    </>
  );
}

function displayName(t: TickerItem) {
  const base = t.symbol.replace(/USDT$/, '').toUpperCase();
  const name = (t.name || base).trim();
  return `${name} (${base})`;
}
