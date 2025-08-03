import Link from 'next/link';
import { CATEGORIES } from '@/lib/categories';
import styles from './CategoryNavbar.module.css';

interface Props {
  open?: boolean;
  onNavigate?: () => void;
}

export default function CategoryNavbar({ open, onNavigate }: Props = {}) {
  return (
    <nav className={`${styles.nav} ${open ? styles.open : ''}`} aria-label="categories">
      <Link href="/" className={styles.link} onClick={onNavigate}>
        Home
      </Link>
      {CATEGORIES.map((c) => (
        <Link key={c} href={`/category/${c}`} className={styles.link} onClick={onNavigate}>
          {c}
        </Link>
      ))}
      <Link href="/weather" className={styles.link} onClick={onNavigate}>
       Weather
      </Link>
      <Link href="/bar" className={styles.link} onClick={onNavigate}>
        Bar
      </Link>
    </nav>
  );
}
