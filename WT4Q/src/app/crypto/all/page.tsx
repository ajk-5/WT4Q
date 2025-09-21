import CryptoAllPage from '@/components/CryptoAllPage';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'All Cryptocurrencies (Searchable)',
  description: 'Browse and search all tradable USDT pairs. Click a symbol for details and charts.',
  alternates: { canonical: '/crypto/all' },
};

export default function Page() {
  return <CryptoAllPage />;
}

