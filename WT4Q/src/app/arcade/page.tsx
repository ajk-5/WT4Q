import type { Metadata } from 'next';
import PrefetchLink from '@/components/PrefetchLink';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: 'Arcade | The Nineties Times',
  description: 'Drop coins and play retro web games in the 90s arcade.',
  alternates: { canonical: '/arcade' },
};

const games = [
  {
    title: 'Neon Snake',
    description: 'Eat the glow, dodge your tail, and chase a saved high score.',
    href: '/arcade/snake',
    tag: 'Classic',
  },
  {
    title: 'CRT Pong',
    description: 'One paddle, one ball, and a CPU rival that never blinks.',
    href: '/arcade/pong',
    tag: 'Classic',
  },
  {
    title: 'Block Breaker',
    description: 'Smash the bricks, keep the ball alive, and clear the level.',
    href: '/arcade/breakout',
    tag: 'Classic',
  },
  {
    title: 'Merge Fire',
    description: 'Fast reflexes, bright visuals, and a score chase worthy of the 90s.',
    href: '/arcade/mergefire',
    tag: 'Arcade',
  },
];

export default function ArcadePage() {
  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <span className={styles.kicker}>Arcade mode</span>
        <h1>Retro Games Lobby</h1>
        <p>
          Pick a cabinet, hit start, and chase high scores. New games and challenges
          drop regularly.
        </p>
      </header>

      <section className={styles.grid}>
        {games.map((game) => (
          <PrefetchLink key={game.title} href={game.href} className={styles.card}>
            <div className={styles.cardTop}>
              <span className={styles.tag}>{game.tag}</span>
              <h2>{game.title}</h2>
            </div>
            <p>{game.description}</p>
            <span className={styles.cta}>Play now</span>
          </PrefetchLink>
        ))}
      </section>
    </div>
  );
}
