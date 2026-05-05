'use client';

import AdSlot from './AdSlot';

export default function CryptoPageAd({ className }: { className?: string }) {
  return (
    <div className={className} style={{ margin: '1rem 0' }}>
      <AdSlot slot="8899021701" format="auto" />
    </div>
  );
}
