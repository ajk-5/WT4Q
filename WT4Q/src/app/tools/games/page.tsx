import Link from 'next/link';
import { Metadata } from 'next';
import PrefetchLink from '@/components/PrefetchLink';

export const metadata: Metadata = {
  title: 'Tools',
  description: 'Handy utilities including a world clock with weather data.',
};

export default function GamesPage() {
  return (
    <main style={{ padding: '1rem' }}>
      <h1>Tools</h1>
      <ul>
        <li>
          <PrefetchLink href="/tools/games/2048_game_online">2048</PrefetchLink>
          
        </li>

      </ul>
    </main>
  );
}
