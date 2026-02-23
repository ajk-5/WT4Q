import type { Metadata } from 'next';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: 'Merge Fire | The Nineties Times Arcade',
  description: 'Play Merge Fire in the 90s arcade.',
  alternates: { canonical: '/arcade/mergefire' },
};

export default function MergeFirePage() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1>Merge Fire</h1>
        <p>Best played in landscape mode. Hit refresh for a new run.</p>
      </header>
      <div className={styles.frame}>
        <iframe
          src="/games/MergeFire/mergefire.html"
          title="Merge Fire"
          className={styles.iframe}
          sandbox="allow-scripts allow-same-origin"
        />
      </div>
    </div>
  );
}
