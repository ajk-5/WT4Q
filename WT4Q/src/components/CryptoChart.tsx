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
  }, [data]);

  return (
    <div ref={containerRef} className={className} aria-label={`${symbol} ${interval} chart`} />
  );
}
