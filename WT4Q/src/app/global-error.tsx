'use client';

import PrefetchLink from '@/components/PrefetchLink';
import { useEffect } from 'react';
import HomeIcon from '../components/HomeIcon';
import styles from './error-page.module.css';

export default function GlobalError({ error }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html>
      <body className={styles.container}>
        <div className={styles.paper}>
          <span className={styles.heading}>Breaking News</span>
          <h1 className={styles.headline}>Something went wrong</h1>
          <p className={styles.message}>Sorry, an unexpected error occurred.</p>
          <PrefetchLink href="/" className={styles.homeLink}>
            <HomeIcon className={styles.homeIcon} />
            Back to the homepage
          </PrefetchLink>
        </div>
      </body>
    </html>
  );
}
