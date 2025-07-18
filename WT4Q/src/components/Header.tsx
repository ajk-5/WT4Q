import Link from 'next/link';
import styles from './Header.module.css';

export default function Header() {
  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <Link href="/" className={styles.logo}>
          WT4Q News
        </Link>
        <nav className={styles.nav}>
          <Link href="/" className={styles.navLink}>Home</Link>
          <Link href="/search" className={styles.navLink}>Search</Link>
        </nav>
      </div>
    </header>
  );
}
