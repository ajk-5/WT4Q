import type { Metadata } from 'next';
import { Suspense } from 'react';
import SearchContent from './SearchContent';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Search the archives | The Nineties Times',
  description:
    'Find articles across politics, business, sports, culture and more from The Nineties Times archive.',
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
    <Suspense>
      <SearchContent />
    </Suspense>
  );
}
