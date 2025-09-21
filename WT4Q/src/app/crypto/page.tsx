import type { Metadata } from 'next';
import CryptoPageShell from '@/components/CryptoPageShell';

// Keep the page dynamic but allow route/API caching to work
export const revalidate = 0;

export const metadata: Metadata = {
  title: 'Live Crypto Prices, Charts & Market Data',
  description:
    'Real-time cryptocurrency prices and candlestick charts powered by Binance: BTC, ETH, BNB and more. View 1m, 5m, 1h, 1d, 1w, 1M and yearly ranges.',
  keywords: [
    'crypto prices',
    'live crypto',
    'bitcoin price',
    'ethereum price',
    'BTCUSDT',
    'ETHUSDT',
    'BNB',
    'candlestick chart',
    'binance',
  ],
  alternates: { canonical: '/crypto' },
  openGraph: {
    title: 'Live Crypto Prices & Charts',
    description:
      'Track real-time cryptocurrency prices and candlestick charts for top assets from Binance.',
    url: '/crypto',
    type: 'website',
  },
  robots: { index: true, follow: true },
};

export default function Page() {
  return <CryptoPageShell />;
}
