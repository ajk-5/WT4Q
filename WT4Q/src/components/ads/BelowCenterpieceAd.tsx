'use client';

import styles from './InlineCardAd.module.css';
import AdSlot from './AdSlot';

export default function BelowCenterpieceAd() {
  return (
    <div className={styles.cardAd} role="region" aria-label="Advertisement">
      <span className={styles.label}>Advertisement</span>
      <AdSlot slot="8822451349" format="auto" className={styles.slot} />
    </div>
  );
}
