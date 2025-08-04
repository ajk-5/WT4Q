import Link from 'next/link';
import { Metadata } from 'next';

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
          <Link href="/tools/world-clock">World Clock</Link>
        </li>
      </ul>
    </main>
  );
}
