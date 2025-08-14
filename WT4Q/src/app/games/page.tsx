import { Metadata } from 'next';
import PrefetchLink from '@/components/PrefetchLink';
import styles from './Games.module.css';

export const metadata: Metadata = {
  title: 'Games',
  description: 'Casual games to play during your break.',
};

export default function GamesPage() {
  return (
    <main className={styles.main}>
      <h1>Games</h1>
      <ul className={styles.list}>
        <li className={styles.item}>
          <PrefetchLink
            href="/games/2048_game_online"
            title="Play the classic 2048 puzzle game"
          >
            2048
          </PrefetchLink>
          <div className={styles.preview}>
            <img
              src="https://via.placeholder.com/200?text=2048"
              alt="2048 preview"
            />
          </div>
        </li>
      </ul>
    </main>
  );
}
