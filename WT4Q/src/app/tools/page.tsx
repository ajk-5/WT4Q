import { Metadata } from 'next';
import PrefetchLink from '@/components/PrefetchLink';

export const metadata: Metadata = {
  title: 'Tools',
  description:
    'Handy utilities including a free online Photoshop-like editor and a world clock.',
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
        <li>
          <PrefetchLink href="/tools/online-photoshop">
            Free Online Photoshop
          </PrefetchLink>
        </li>
      </ul>
    </main>
  );
}
