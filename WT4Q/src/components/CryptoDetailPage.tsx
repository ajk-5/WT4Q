"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import CryptoChart, { Candle } from './CryptoChart';
import styles from './CryptoDetail.module.css';

const TIMEFRAMES = ['1m', '5m', '1h', '1d', '1w', '1M', '1y'] as const;
type Timeframe = typeof TIMEFRAMES[number];

type CoinInfo = {
  id: string;
  name: string;
  symbol: string;
  image: string | null;
  homepage: string | null;
  description: string | null;
  rank?: number | null;
  categories?: string[];
  links?: { website?: string | null; twitter?: string | null; reddit?: string | null; github?: string[]; explorers?: string[] };
  marketCap: number | null;
  fdv?: number | null;
  currentPrice: number | null;
  totalVolume: number | null;
  high24h?: number | null;
  low24h?: number | null;
  ath?: number | null;
  athDate?: string | null;
  atl?: number | null;
  atlDate?: string | null;
  supply?: { circulating?: number | null; total?: number | null; max?: number | null };
  priceChange1h: number | null;
  priceChange24h: number | null;
  priceChange7d: number | null;
  priceChange30d?: number | null;
  priceChange1y?: number | null;
};

export default function CryptoDetailPage({ symbol }: { symbol: string }) {
  const router = useRouter();
  const [tf, setTf] = useState<Timeframe>('1h');
  const [candles, setCandles] = useState<Candle[]>([]);
  const [coin, setCoin] = useState<CoinInfo | null>(null);
  const [news, setNews] = useState<{ title: string; link: string; pubDate?: string; description?: string }[]>([]);
  const base = (symbol || '').toUpperCase().replace(/USDT$/, '');

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch(`/api/crypto/coin?base=${base}`);
        if (res.ok) {
          const data = (await res.json()) as CoinInfo;
          if (active) setCoin(data);
        }
      } catch {}
    })();
    return () => { active = false; };
  }, [base]);

  useEffect(() => {
    let active = true;
    const q = coin?.name ? `${coin.name} OR ${base}` : base;
    (async () => {
      try {
        const res = await fetch(`/api/crypto/news?q=${encodeURIComponent(q)}`);
        if (res.ok) {
          const items = (await res.json()) as { title: string; link: string; pubDate?: string; description?: string }[];
          if (active) setNews(items);
        }
      } catch {}
    })();
    return () => { active = false; };
  }, [base, coin?.name]);

  useEffect(() => {
    let active = true;
    (async () => {
      const limit = tf === '1m' ? 1200 : tf === '5m' ? 1200 : tf === '1h' ? 1000 : tf === '1d' ? 700 : tf === '1w' ? 800 : tf === '1M' ? 600 : 365;
      const res = await fetch(`/api/crypto/klines?symbol=${symbol}&interval=${tf}&limit=${limit}`);
      if (res.ok) {
        const data = (await res.json()) as Candle[];
        if (active) setCandles(data);
      }
    })();
    return () => { active = false; };
  }, [symbol, tf]);

  return (
    <div className={styles.container}>
      <div className={styles.backRow}>
        <button
          type="button"
          className={styles.btn}
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
      <div className={styles.header}>
        {coin?.image ? <img src={coin.image} alt="" width={36} height={36} /> : null}
        <h1 className={styles.title}>{(coin?.name || base)} ({base})</h1>
        {coin ? <span className={styles.meta}>Mkt cap: {coin.marketCap ? formatCurrency(coin.marketCap) : '—'}</span> : null}
      </div>
      <div className={styles.grid}>
        <section className={styles.card}>
          <div className={styles.toolbar}>
            {TIMEFRAMES.map((k) => (
              <button key={k} className={`${styles.btn} ${tf === k ? styles.btnActive : ''}`} onClick={() => setTf(k)}>{k}</button>
            ))}
          </div>
          <CryptoChart data={candles} symbol={symbol} interval={tf} className={styles.chart} />
        </section>
        <aside className={styles.card}>
          {coin ? (
            <div className={styles.list}>
              {coin.description ? <p className={styles.meta}>{coin.description}</p> : null}
              <div className={styles.meta}>
                {coin.rank ? <div>Rank: #{coin.rank}</div> : null}
                {coin.categories && coin.categories.length ? <div>Categories: {coin.categories.join(', ')}</div> : null}
                <div>Price: {formatCurrency(coin.currentPrice ?? undefined)}</div>
                <div>24h: {fmtPct(coin.priceChange24h)} • 1h: {fmtPct(coin.priceChange1h)} • 7d: {fmtPct(coin.priceChange7d)}</div>
                <div>30d: {fmtPct(coin.priceChange30d)} • 1y: {fmtPct(coin.priceChange1y)}</div>
                <div>Market cap: {formatCurrency(coin.marketCap ?? undefined)} • FDV: {formatCurrency(coin.fdv ?? undefined)}</div>
                <div>24h High/Low: {formatCurrency(coin.high24h ?? undefined)} / {formatCurrency(coin.low24h ?? undefined)}</div>
                <div>
                  Supply: Circulating {formatNumber(coin.supply?.circulating)} • Total {formatNumber(coin.supply?.total)} • Max {formatNumber(coin.supply?.max)}
                </div>
                <div>
                  ATH: {formatCurrency(coin.ath ?? undefined)} {coin.athDate ? `(${new Date(coin.athDate).toLocaleDateString()})` : ''}
                  {' '}• ATL: {formatCurrency(coin.atl ?? undefined)} {coin.atlDate ? `(${new Date(coin.atlDate).toLocaleDateString()})` : ''}
                </div>
                {coin.links ? (
                  <div>
                    {coin.links.website ? <a className={styles.newsTitle} href={coin.links.website} target="_blank" rel="noopener noreferrer">Website</a> : null}
                    {coin.links.twitter ? <> • <a className={styles.newsTitle} href={coin.links.twitter} target="_blank" rel="noopener noreferrer">Twitter</a></> : null}
                    {coin.links.reddit ? <> • <a className={styles.newsTitle} href={coin.links.reddit} target="_blank" rel="noopener noreferrer">Reddit</a></> : null}
                    {coin.links.github && coin.links.github.length ? (
                      <>
                        {' '}• GitHub: {coin.links.github.map((g, i) => (
                          <a key={g} className={styles.newsTitle} href={g} target="_blank" rel="noopener noreferrer">repo{i+1}</a>
                        ))}
                      </>
                    ) : null}
                  </div>
                ) : null}
              </div>
              <h3 className={styles.title} style={{ marginTop: '0.75rem' }}>Latest news</h3>
              <div className={styles.list}>
                {news.map((n, i) => (
                  <div key={`${n.link || n.title || 'item'}-${n.pubDate || i}`} className={styles.newsItem}>
                    <a className={styles.newsTitle} href={n.link} target="_blank" rel="noopener noreferrer">{n.title}</a>
                    {n.description ? <span className={styles.newsMeta}>{stripHtml(n.description)}</span> : null}
                    {n.pubDate ? <span className={styles.newsMeta}>{new Date(n.pubDate).toLocaleString()}</span> : null}
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </aside>
      </div>
    </div>
  );
}

function formatCurrency(n?: number | null) {
  if (!n || !isFinite(n)) return '—';
  return n.toLocaleString(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
}

function formatNumber(n?: number | null) {
  if (!n || !isFinite(n)) return '—';
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(2)}k`;
  return `${n}`;
}

function fmtPct(n?: number | null) {
  if (n === null || n === undefined || !isFinite(n)) return '—';
  const s = `${Math.abs(n).toFixed(2)}%`;
  return n >= 0 ? `▲ ${s}` : `▼ ${s}`;
}

function stripHtml(html?: string) {
  if (!html) return '';
  return html.replace(/<[^>]+>/g, '').trim();
}
