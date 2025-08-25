import { Metadata } from 'next';
import PrefetchLink from '@/components/PrefetchLink';
import styles from './Games.module.css';
import Image from 'next/image';

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
          <Image
            src="/images/2048.png"
            alt="2048 game preview"
            width={602}
            height={470}
            quality={100}
            sizes="(max-width: 768px) 4rem, (max-width: 1200px) 5rem, 6rem"
            className={styles.logoImage}
            priority
          />
          </div>
        </li>
        <li className={styles.item}>
          <PrefetchLink href="/games/tetris" title="Play Tetris">
            Tetris
          </PrefetchLink>
          <div className={styles.preview}>
          <Image
            src="/images/tetris.png"
            alt="tetris game preview"
            width={602}
            height={470}
            quality={100}
            sizes="(max-width: 768px) 4rem, (max-width: 1200px) 5rem, 6rem"
            className={styles.logoImage}
            priority
          />
          </div>
        </li>
        <li className={styles.item}>
          <PrefetchLink
            href="/games/metrotrade"
            title="Play Metropolotan Trader"
          >
            Metropolotan Trader
          </PrefetchLink>
          <div className={styles.preview}>
          <Image
            src="/images/metrotrade.png"
            alt="Metrotrade preview"
            width={602}
            height={470}
            quality={100}
            sizes="(max-width: 768px) 4rem, (max-width: 1200px) 5rem, 6rem"
            className={styles.logoImage}
            priority
          />
          </div>
        </li>
      </ul>
    </main>
  );
}
