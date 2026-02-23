import PrefetchLink from './PrefetchLink';
import { CATEGORY_DEFINITIONS } from '@/lib/categories';
import HomeIcon from './HomeIcon';
import styles from './CategoryNavbar.module.css';
import { VAULT_BASE } from '@/lib/vaultPaths';

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
      <PrefetchLink href={VAULT_BASE} className={styles.link} onClick={onNavigate}>
        90s Exclusive
      </PrefetchLink>
      <PrefetchLink href="/arcade" className={styles.link} onClick={onNavigate}>
        Arcade
      </PrefetchLink>
      <PrefetchLink href="/jokes" className={styles.link} onClick={onNavigate}>
        Jokes
      </PrefetchLink>
      <PrefetchLink href="/on-this-day-in-the-90s" className={styles.link} onClick={onNavigate}>
        On This Day
      </PrefetchLink>
      <PrefetchLink href="/forum" className={styles.link} onClick={onNavigate}>
        Forum
      </PrefetchLink>
      <div className={styles.dropdown}>
        <PrefetchLink
          href="/category"
          className={styles.link}
          onClick={onNavigate}
        >
          Time Capsule
        </PrefetchLink>
        <div className={styles.dropdownMenu}>
          <PrefetchLink
            href="/category#blast-from-the-past"
            className={styles.link}
            onClick={onNavigate}
          >
            Blast from the Past
          </PrefetchLink>
          {CATEGORY_DEFINITIONS.map((c) => (
            <PrefetchLink
              key={c.key}
              href={`/category/${encodeURIComponent(c.key)}`}
              className={styles.link}
              onClick={onNavigate}
            >
              {c.label}
            </PrefetchLink>
          ))}
        </div>
        
      </div>
      <PrefetchLink href="/trending" className={styles.link} onClick={onNavigate}>
        Most Loved
      </PrefetchLink>
      <PrefetchLink href="/crypto" className={styles.link} onClick={onNavigate}>
        Crypto
      </PrefetchLink>
      {/* Tools and Games links removed for credibility */}
      <PrefetchLink href="/bar" className={styles.link} onClick={onNavigate}>
        Bar
      </PrefetchLink>
    </nav>
  );
}
