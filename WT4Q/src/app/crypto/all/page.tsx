import CryptoAllPage from '@/components/CryptoAllPage';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'All Crypto Listings | The Nineties Times',
  description: 'Browse the full list of tradable USDT pairs in the Crypto Control Room.',
  alternates: { canonical: '/crypto/all' },
};

export default function Page() {
  return <CryptoAllPage />;
}
