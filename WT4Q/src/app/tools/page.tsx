import { Metadata } from 'next';
import PrefetchLink from '@/components/PrefetchLink';

export const metadata: Metadata = {
  title: 'Tools',
  description: 'Handy utilities including a world clock with weather data.',
};

export default function ToolsPage() {
  return (
    <main style={{ padding: '1rem' }}>
      <h1>Tools</h1>
      <ul>
        <li>
          <PrefetchLink href="/tools/world-clock">World Clock</PrefetchLink>
          
        </li>
        <li>
          <PrefetchLink href="/tools/mememaker">Mememaker</PrefetchLink>
        </li>
      </ul>
    </main>
  );
}
