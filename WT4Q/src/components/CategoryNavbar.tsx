import PrefetchLink from './PrefetchLink';
import { CATEGORIES } from '@/lib/categories';
import HomeIcon from './HomeIcon';
import styles from './CategoryNavbar.module.css';

interface Props {
  open?: boolean;
  onNavigate?: () => void;
}

export default function CategoryNavbar({ open, onNavigate }: Props = {}) {
  return (
    <nav className={`${styles.nav} ${open ? styles.open : ''}`}>
      <PrefetchLink href="/" className={styles.link} onClick={onNavigate}>
        <HomeIcon className={styles.homeIcon} />
        <span className={styles.homeText}>Home</span>
      </PrefetchLink>
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
      <div className={styles.dropdown}>
        <PrefetchLink href="/tools" className={styles.link} onClick={onNavigate}>
          Tools
        </PrefetchLink>
        <div className={styles.dropdownMenu}>
          <PrefetchLink
            href="/tools/world-clock"
            className={styles.link}
            onClick={onNavigate}
          >
            World Clock
          </PrefetchLink>
          <PrefetchLink
            href="/tools/mememaker"
            className={styles.link}
            onClick={onNavigate}
          >
            Mememaker
          </PrefetchLink>

        </div>
      </div>
      <div className={styles.dropdown}>
        <PrefetchLink href="/games" className={styles.link} onClick={onNavigate}>
          Games
        </PrefetchLink>
        <div className={styles.dropdownMenu}>
          <PrefetchLink
            href="/games/2048_game_online"
            className={styles.link}
            onClick={onNavigate}
          >
            2048
          </PrefetchLink>
          <PrefetchLink
            href="/games/metrotrade"
            className={styles.link}
            onClick={onNavigate}
          >
            Metropolotan Trader
          </PrefetchLink>
        </div>
      </div>
      <PrefetchLink href="/weather" className={styles.link} onClick={onNavigate}>
        Weather
      </PrefetchLink>
      <PrefetchLink href="/bar" className={styles.link} onClick={onNavigate}>
        Bar
      </PrefetchLink>
    </nav>
  );
}
