"use client";

import { useState, useEffect } from 'react';
import PrefetchLink from './PrefetchLink';
import Image from 'next/image';
import CategoryNavbar from './CategoryNavbar';
import SearchBar from './SearchBar';
import UserMenu from './UserMenu';
import WeatherWidget from './WeatherWidget';
import MenuIcon from './MenuIcon';
import NotificationBell from './NotificationBell';
import styles from './Header.module.css';

export default function Header() {
  const [open, setOpen] = useState(false);
  // Start hidden to match the server-rendered markup and avoid hydration mismatches.
  // The header visibility is then adjusted on the client based on the scroll position.
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    let lastY = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      if (y < 50) {
        setHidden(false);
      } else if (y < lastY) {
        setHidden(false);
      } else if (y > lastY) {
        setHidden(true);
      }
      lastY = y;
    };

    // Run once on mount to ensure the initial visibility matches the scroll position.
    onScroll();
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleNavigate = () => {
    if (window.innerWidth <= 1024) setOpen(false);
  };

  return (
    <header className={`${styles.header} ${hidden ? styles.hidden : ''}`}>
      {open && <div className={styles.overlay} onClick={() => setOpen(false)} />}
      <div className={styles.inner}>
        <PrefetchLink href="/" className={styles.logo}>
          <Image
            src="/images/wt4q-logo.png"
            alt="WT4Q logo"
            width={602}
            height={470}
            quality={100}
            sizes="(max-width: 768px) 4rem, (max-width: 1200px) 5rem, 6rem"
            className={styles.logoImage}
            priority
          />
        </PrefetchLink>
        <PrefetchLink
          href="/weather"
          aria-label="Weather details"
          className={styles.weather}
        >
          <WeatherWidget />
        </PrefetchLink>
        <div className={styles.actions}>
          <button
            className={styles.menuButton}
            onClick={() => setOpen((o) => !o)}
            aria-label="Open categories"
          >
            <MenuIcon className={styles.menuIcon} />
          </button>
          <NotificationBell />
          <div className={styles.userMenu}>
            <UserMenu />
          </div>
        </div>
        <div className={styles.search}>
          <SearchBar />
        </div>
      </div>
      <div className={styles.categories}>
        <CategoryNavbar open={open} onNavigate={handleNavigate} />
      </div>
    </header>
  );
}
