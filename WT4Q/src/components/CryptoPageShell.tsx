'use client';

import dynamic from 'next/dynamic';

// Client-only wrapper to avoid SSR for heavy charting libs
const CryptoPage = dynamic(() => import('@/components/CryptoPage'), { ssr: false });

export default function CryptoPageShell() {
  return <CryptoPage />;
}

