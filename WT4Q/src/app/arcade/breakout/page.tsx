import type { Metadata } from 'next';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: 'Block Breaker | The Nineties Times Arcade',
  description: 'Play Block Breaker in the 90s arcade.',
  alternates: { canonical: '/arcade/breakout' },
};

export default function BreakoutPage() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1>Block Breaker</h1>
        <p>Left/Right arrows or A/D. Drag paddle on mobile.</p>
      </header>
      <div className={styles.frame}>
        <iframe
          src="/games/Breakout/breakout.html"
          title="Block Breaker"
          className={styles.iframe}
          sandbox="allow-scripts allow-same-origin"
        />
      </div>
    </div>
  );
}

