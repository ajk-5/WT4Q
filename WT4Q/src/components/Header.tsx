"use client";

import { useState } from 'react';
import PrefetchLink from './PrefetchLink';
import Image from 'next/image';
import CategoryNavbar from './CategoryNavbar';
import SearchBar from './SearchBar';
import UserMenu from './UserMenu';
import WeatherWidget from './WeatherWidget';
import MenuIcon from './MenuIcon';
import NotificationBell from './NotificationBell';
import styles from './Header.module.css';
import { isLoggedIn } from '@/lib/auth';

export default function Header() {
  const [open, setOpen] = useState(false);

  const handleNavigate = () => {
    if (window.innerWidth <= 1024) setOpen(false);
  };

  return (
    <header className={styles.header}>
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
          {isLoggedIn() && <NotificationBell />}
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
