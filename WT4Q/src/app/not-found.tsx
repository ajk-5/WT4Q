import Link from 'next/link';
import HomeIcon from '../components/HomeIcon';
import styles from './error-page.module.css';

export default function NotFound() {
  return (
    <div className={styles.container}>
      <div className={styles.paper}>
        <span className={styles.heading}>Breaking News</span>
        <h1 className={styles.headline}>Page not found</h1>
        <p className={styles.message}>Sorry, we couldn&apos;t find the page you were looking for.</p>
        <Link href="/" className={styles.homeLink}>
          <HomeIcon className={styles.homeIcon} />
          Back to the homepage
        </Link>
      </div>
    </div>
  );
}
