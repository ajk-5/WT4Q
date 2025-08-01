import Link from 'next/link';
import Image from 'next/image';
import CategoryNavbar from './CategoryNavbar';
import SearchBar from './SearchBar';
import UserMenu from './UserMenu';
import WeatherWidget from './WeatherWidget';
import MenuIcon from './MenuIcon';
import styles from './Header.module.css';

export default function Header() {
  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <UserMenu />
        <div className={styles.search}>
          <SearchBar />
        </div>
        <Link href="/weather" aria-label="Weather details">
          <WeatherWidget />
        </Link>
        <Link href="/" className={styles.logo}>
          <Image
            src="/images/wt4q-logo.png"
            alt="WT4Q logo"
            width={0}
            height={0}
            sizes="3rem"
            className={styles.logoImage}
            priority
          />
        </Link>
      </div>
      <div className={styles.categories}>
        <CategoryNavbar />
      </div>
    </header>
  );
}
