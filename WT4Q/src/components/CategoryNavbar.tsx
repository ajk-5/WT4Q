import PrefetchLink from './PrefetchLink';
import { CATEGORIES } from '@/lib/categories';
import HomeIcon from './HomeIcon';
import styles from './CategoryNavbar.module.css';

interface Props {
  open?: boolean;
  onNavigate?: () => void;
  /** Force mobile-style sidebar regardless of screen size */
  forceSidebar?: boolean;
}

export default function CategoryNavbar({ open, onNavigate, forceSidebar }: Props = {}) {
  return (
    <nav className={`${styles.nav} ${forceSidebar ? styles.sidebar : ''} ${open ? styles.open : ''}`}>
      <PrefetchLink href="/" className={styles.link} onClick={onNavigate}>
        <HomeIcon className={styles.homeIcon} />
        <span className={styles.homeText}>Home</span>
      </PrefetchLink>
      <div className={styles.dropdown}>
        <PrefetchLink
          href="/category"
          className={styles.link}
          onClick={onNavigate}
        >
          Category
        </PrefetchLink>
        <div className={styles.dropdownMenu}>
          {CATEGORIES.map((c) => (
            <PrefetchLink
              key={c}
              href={`/category/${c}`}
              className={styles.link}
              onClick={onNavigate}
            >
              {c}
            </PrefetchLink>
          ))}
        </div>
        
      </div>
            <PrefetchLink href="/trending" className={styles.link} onClick={onNavigate}>
       Trending news 
      </PrefetchLink>
      <PrefetchLink href="/crypto" className={styles.link} onClick={onNavigate}>
        Crypto
      </PrefetchLink>
      {/* Tools and Games links removed for credibility */}
      <PrefetchLink href="/weather" className={styles.link} onClick={onNavigate}>
        Weather
      </PrefetchLink>
      <PrefetchLink href="/bar" className={styles.link} onClick={onNavigate}>
        Bar
      </PrefetchLink>
    </nav>
  );
}
