import type { Metadata } from 'next';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: 'Neon Snake | The Nineties Times Arcade',
  description: 'Play Neon Snake in the 90s arcade.',
  alternates: { canonical: '/arcade/snake' },
};

export default function SnakePage() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1>Neon Snake</h1>
        <p>Arrow keys/WASD. Swipe or use the D-pad on mobile.</p>
      </header>
      <div className={styles.frame}>
        <iframe
          src="/games/Snake/snake.html"
          title="Neon Snake"
          className={styles.iframe}
          sandbox="allow-scripts allow-same-origin"
        />
      </div>
    </div>
  );
}

