import type { Metadata } from 'next';
import { Suspense } from 'react';
import SearchContent from './SearchContent';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Search the 90s archive | The Nineties Times',
  description:
    'Search 90s jokes, nostalgia stories, pop-culture guides, time capsules, retro tech, music, movies and decade-defining archive features.',
  robots: {
    index: false,
    follow: true,
  },
  alternates: {
    canonical: '/search',
  },
};

export default function SearchPage() {
  return (
    <Suspense fallback={null}>
      <SearchContent />
    </Suspense>
  );
}
