import Link from 'next/link';
import { CATEGORIES } from '@/lib/categories';
import styles from './CategoryNavbar.module.css';

export default function CategoryNavbar() {
  return (
    <nav className={styles.nav} aria-label="categories">
      <Link href="/" className={styles.link}>
        Home
      </Link>
      {CATEGORIES.map((c) => (
        <Link key={c} href={`/category/${c}`} className={styles.link}>
          {c}
        </Link>
      ))}
      <Link href="/bar" className={styles.link}>
        Bar
      </Link>
    </nav>
  );
}
