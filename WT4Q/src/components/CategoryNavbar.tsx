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
          <PrefetchLink
            href="/tools/qr-code-generator"
            className={styles.link}
            onClick={onNavigate}
          >
            QR Code Scanner
          </PrefetchLink>
            <PrefetchLink
           href="/tools/typing-practice"
        className={styles.link}
        onClick={onNavigate}
                >
             Typing Practice
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
          <PrefetchLink
            href="/games/tetris"
            className={styles.link}
            onClick={onNavigate}
          >
            Tetris
          </PrefetchLink>
        </div>
      </div>
      <PrefetchLink href="/weather" className={styles.link} onClick={onNavigate}>
        Weather
      </PrefetchLink>
      <PrefetchLink href="/astrology" className={styles.link} onClick={onNavigate}>
        Astrology
      </PrefetchLink>
      <PrefetchLink href="/bar" className={styles.link} onClick={onNavigate}>
        Bar
      </PrefetchLink>
    </nav>
  );
}
