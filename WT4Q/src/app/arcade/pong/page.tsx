import type { Metadata } from 'next';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: 'CRT Pong | The Nineties Times Arcade',
  description: 'Play CRT Pong in the 90s arcade.',
  alternates: { canonical: '/arcade/pong' },
};

export default function PongPage() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1>CRT Pong</h1>
        <p>Up/Down arrows or W/S. Drag paddle on mobile.</p>
      </header>
      <div className={styles.frame}>
        <iframe
          src="/games/Pong/pong.html"
          title="CRT Pong"
          className={styles.iframe}
          sandbox="allow-scripts allow-same-origin"
        />
      </div>
    </div>
  );
}

