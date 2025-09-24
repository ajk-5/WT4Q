"use client";

import { useEffect, useRef } from 'react';
import { createChart, ColorType, UTCTimestamp } from 'lightweight-charts';

export type Candle = {
  time: number; // seconds since epoch
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
};

type Props = {
  data: Candle[];
  symbol: string;
  interval: string;
  className?: string;
};

export default function CryptoChart({ data, symbol, interval, className }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<ReturnType<typeof createChart> | null>(null);
  const seriesRef = useRef<ReturnType<ReturnType<typeof createChart>['addCandlestickSeries']> | null>(null);
  const volRef = useRef<ReturnType<ReturnType<typeof createChart>['addHistogramSeries']> | null>(null);
  const lastBarRef = useRef<Candle | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const chart = createChart(container, {
      autoSize: true,
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#000',
        fontFamily: 'Arial, Helvetica, sans-serif',
      },
      grid: {
        vertLines: { color: 'rgba(0,0,0,0.12)' },
        horzLines: { color: 'rgba(0,0,0,0.12)' },
      },
      rightPriceScale: { borderVisible: false },
      timeScale: { borderVisible: false, timeVisible: true, secondsVisible: interval === '1m' },
      crosshair: { vertLine: { width: 1, color: 'rgba(0,0,0,0.3)' }, horzLine: { color: 'rgba(0,0,0,0.3)' } },
    });

    const candleSeries = chart.addCandlestickSeries({
      upColor: '#26a69a',
      borderUpColor: '#26a69a',
      wickUpColor: '#26a69a',
      downColor: '#ef5350',
      borderDownColor: '#ef5350',
      wickDownColor: '#ef5350',
    });

    const volSeries = chart.addHistogramSeries({
      priceFormat: { type: 'volume' },
      priceScaleId: '',
      color: 'rgba(0,0,0,0.2)',
    });
    try {
      chart.priceScale('').applyOptions({ scaleMargins: { top: 0.8, bottom: 0 } });
    } catch {}

    chartRef.current = chart;
    seriesRef.current = candleSeries;
    volRef.current = volSeries;

    const ro = new ResizeObserver(() => chart.applyOptions({ autoSize: true }));
    ro.observe(container);

    return () => {
      ro.disconnect();
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
      volRef.current = null;
    };
  }, [interval]);

  useEffect(() => {
    const s = seriesRef.current;
    const v = volRef.current;
    if (!s || !v) return;
    const mapped = data.map((c) => ({
      time: c.time as UTCTimestamp,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    }));
    s.setData(mapped);
    v.setData(data.map((c) => ({
      time: c.time as UTCTimestamp,
      value: c.volume ?? 0,
      color: c.close >= c.open ? 'rgba(38,166,154,0.4)' : 'rgba(239,83,80,0.4)',
    })));
    chartRef.current?.timeScale().fitContent();
    lastBarRef.current = data.length ? data[data.length - 1] : null;
  }, [data]);

  // Realtime updates via Binance WebSocket for supported intervals
  useEffect(() => {
    const s = seriesRef.current;
    const v = volRef.current;
    if (!s || !v) return;

    const supported: Record<string, true> = {
      '1m': true, '3m': true, '5m': true, '15m': true, '30m': true,
      '1h': true, '2h': true, '4h': true, '6h': true, '8h': true, '12h': true,
      '1d': true, '3d': true, '1w': true, '1M': true,
    };
    if (!supported[interval]) {
      return undefined; // no realtime stream (e.g., 1y custom)
    }

    const streamSymbol = (symbol || '').toLowerCase();
    if (!streamSymbol) return undefined;
    const stream = `${streamSymbol}@kline_${interval}`;
    let ws: WebSocket | null = null;
    try {
      ws = new WebSocket(`wss://stream.binance.com:9443/ws/${stream}`);
    } catch {
      return undefined;
    }

    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data);
        const k = msg && (msg.k || msg.K);
        if (!k) return;
        const openTime = (k.t ?? k.T) as number; // ms
        const bar: Candle = {
          time: Math.floor(openTime / 1000),
          open: parseFloat(k.o),
          high: parseFloat(k.h),
          low: parseFloat(k.l),
          close: parseFloat(k.c),
          volume: parseFloat(k.v ?? k.q ?? '0'),
        };

        // Update candlestick series
        s.update({
          time: bar.time as UTCTimestamp,
          open: bar.open,
          high: bar.high,
          low: bar.low,
          close: bar.close,
        });
        // Update volume histogram
        v.update({
          time: bar.time as UTCTimestamp,
          value: bar.volume ?? 0,
          color: bar.close >= bar.open ? 'rgba(38,166,154,0.4)' : 'rgba(239,83,80,0.4)',
        });
        lastBarRef.current = bar;
      } catch {
        // ignore malformed frames
      }
    };

    return () => {
      try { ws?.close(); } catch {}
    };
  }, [symbol, interval]);

  return (
    <div ref={containerRef} className={className} aria-label={`${symbol} ${interval} chart`} />
  );
}
