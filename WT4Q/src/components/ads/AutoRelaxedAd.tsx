'use client';

import AdSlot from './AdSlot';

export default function AutoRelaxedAd({ className }: { className?: string }) {
  return (
    <div className={className} style={{ margin: '1rem 0' }}>
      <AdSlot slot="5151348381" format="autorelaxed" />
    </div>
  );
}
