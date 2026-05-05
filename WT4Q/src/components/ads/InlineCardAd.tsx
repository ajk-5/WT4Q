'use client';

import styles from './InlineCardAd.module.css';
import AdSlot from './AdSlot';

export default function InlineCardAd() {
  return (
    <div className={styles.cardAd} role="region" aria-label="Advertisement">
      <span className={styles.label}>Advertisement</span>
      <AdSlot slot="5213722288" format="auto" className={styles.slot} />
    </div>
  );
}
