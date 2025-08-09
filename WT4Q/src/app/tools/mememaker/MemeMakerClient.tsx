'use client';

import dynamic from 'next/dynamic';
import type { JSX } from 'react';

const MemeMaker = dynamic(() => import('@/components/services/MemeMaker'), {
  ssr: false,
});

export default function MemeMakerClient(): JSX.Element {
  return <MemeMaker />;
}
