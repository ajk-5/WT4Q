import Link from 'next/link';
import { CATEGORIES } from '@/lib/categories';
import HomeIcon from './HomeIcon';
import styles from './CategoryNavbar.module.css';

interface Props {
  open?: boolean;
  onNavigate?: () => void;
}

export default function CategoryNavbar({ open, onNavigate }: Props = {}) {
  return (

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
