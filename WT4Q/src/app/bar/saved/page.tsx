import type { Metadata } from 'next';
import AgeGate from '@/components/AgeGate';
import BackNav from '../BackNav';
import styles from '../bar.module.css';
import {
  DEFAULT_OG_IMAGE,
  SITE_NAME,
  canonicalFor,
  defaultOpenGraph,
  robotsDirectives,
} from '@/lib/seo';
import SavedCocktailsClient from './SavedCocktailsClient';

export const metadata: Metadata = {
  title: `Saved Cocktails - ${SITE_NAME}`,
  description:
    'Quick access to your saved cocktail recipes at The Nineties Bar. Saved locally on this device.',
  alternates: { canonical: canonicalFor('/bar/saved') },
  openGraph: {
    ...defaultOpenGraph,
    title: `Saved Cocktails - ${SITE_NAME}`,
    description:
      'Browse and reopen your saved cocktail recipes from The Nineties Bar.',
    url: canonicalFor('/bar/saved'),
    type: 'website',
    images: defaultOpenGraph.images ?? [{ url: DEFAULT_OG_IMAGE }],
  },
  twitter: {
    card: 'summary_large_image',
    title: `Saved Cocktails - ${SITE_NAME}`,
    description:
      'Browse and reopen your saved cocktail recipes from The Nineties Bar.',
    images: [DEFAULT_OG_IMAGE],
  },
  robots: robotsDirectives,
};

export default function SavedCocktailsPage() {
  return (
    <main className={styles.page}>
      <AgeGate storageKey="barVerified">
        <BackNav />
        <SavedCocktailsClient />
      </AgeGate>
    </main>
  );
}

