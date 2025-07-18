import Link from 'next/link';
import CategoryNavbar from './CategoryNavbar';
import SearchBar from './SearchBar';
import styles from './Header.module.css';

export default function Header() {
  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <Link href="/" className={styles.logo}>
          <img src="/images/wt4q-logo.png" alt="WT4Q logo" className={styles.logoImage} />
          WT4Q News
        </Link>
        <nav className={styles.nav}>
          <Link href="/" className={styles.navLink}>Home</Link>
        </nav>
        <div className={styles.search}>
          <SearchBar />
        </div>
      </div>
      <div className={styles.categories}>
        <CategoryNavbar />
      </div>
    </header>
  );
}
