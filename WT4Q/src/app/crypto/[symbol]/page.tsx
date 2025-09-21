import type { Metadata } from 'next';
import CryptoDetailShell from '@/components/CryptoDetailShell';

export const dynamic = 'force-dynamic';

export function generateMetadata({ params }: { params: { symbol: string } }): Metadata {
  const sym = (params.symbol || '').toUpperCase();
  return {
    title: `${sym} price, chart & news`,
    description: `Live ${sym} price chart and latest news.`,
    alternates: { canonical: `/crypto/${sym}` },
  };
}

export default function Page({ params }: { params: { symbol: string } }) {
  const sym = (params.symbol || '').toUpperCase();
  return <CryptoDetailShell symbol={sym} />;
}

