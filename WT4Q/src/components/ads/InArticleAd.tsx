'use client';

import AdSlot from './AdSlot';

export default function InArticleAd({ className }: { className?: string }) {
  return (
    <div className={className} style={{ margin: '1rem 0' }}>
      <AdSlot slot="6286582067" format="fluid" layout="in-article" center />
    </div>
  );
}
