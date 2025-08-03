import Link from 'next/link';
import { CATEGORIES } from '@/lib/categories';
import HomeIcon from './HomeIcon';
import styles from './CategoryNavbar.module.css';

interface Props {
  open?: boolean;
}
export default function CategoryNavbar({ open }: Props = {}) {
  return (
    <nav className={`${styles.nav} ${open ? styles.open : ''}`} aria-label="categories">
      <Link href="/" className={styles.link}>
        <span className={styles.homeText}>Home</span>
        <HomeIcon className={styles.homeIcon} />
      </Link>
      {CATEGORIES.map((c) => (
        <Link key={c} href={`/category/${c}`} className={styles.link}>
          {c}
        </Link>
      ))}
      <Link href="/weather" className={styles.link}>
       Weather
      </Link>
            <Link href="/bar" className={styles.link}>
        Bar
      </Link>
    </nav>
  );
}
