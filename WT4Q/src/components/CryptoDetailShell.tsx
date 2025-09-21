"use client";

import dynamic from 'next/dynamic';

const Detail = dynamic(() => import('./CryptoDetailPage'), { ssr: false });

export default function CryptoDetailShell({ symbol }: { symbol: string }) {
  return <Detail symbol={symbol} />;
}

