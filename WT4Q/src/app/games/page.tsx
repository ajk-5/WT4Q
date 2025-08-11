import { Metadata } from 'next';
import PrefetchLink from '@/components/PrefetchLink';

export const metadata: Metadata = {
  title: 'Games',
  description: 'Casual games to play during your break.',
};

export default function GamesPage() {
  return (
    <main style={{ padding: '1rem' }}>
      <h1>Games</h1>
      <ul>
        <li>
          <PrefetchLink href="/games/2048_game_online">2048</PrefetchLink>
        </li>
        <li>
          <PrefetchLink href="/games/MergeFire/mergefire.html">MergeFire</PrefetchLink>
        </li>
      </ul>
    </main>
  );
}
