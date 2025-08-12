import { Metadata } from 'next';
import PrefetchLink from '@/components/PrefetchLink';
import { cookies } from 'next/headers';

export const metadata: Metadata = {
  title: 'Tools',
  description:
    'Handy utilities including a free online Photoshop-like editor and a world clock.',
};

export default async function ToolsPage() {
  const cookieStore = await cookies();
  const loggedIn = Boolean(cookieStore.get('JwtToken'));

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
        {loggedIn && (
          <li>
            <PrefetchLink href="/tools/online-photoshop">
              Free Online Photoshop
            </PrefetchLink>
          </li>
        )}
      </ul>
    </main>
  );
}
