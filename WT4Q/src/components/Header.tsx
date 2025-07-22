import Link from 'next/link';
import Image from 'next/image';
import CategoryNavbar from './CategoryNavbar';
import SearchBar from './SearchBar';
import UserMenu from './UserMenu';
import styles from './Header.module.css';

export default function Header() {
  return (
    <header className={styles.header}>
      <div className={styles.inner}>
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
        <div className={styles.search}>
          <SearchBar />
        </div>
        <UserMenu />
      </div>
      <div className={styles.categories}>
        <CategoryNavbar />
      </div>
    </header>
  );
}
