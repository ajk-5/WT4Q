'use client';

import AdSlot from './AdSlot';

export default function AfterRelatedAd({ className }: { className?: string }) {
  return (
    <div className={className} style={{ margin: '1rem 0' }}>
      <AdSlot slot="4270221995" format="auto" />
    </div>
  );
}
