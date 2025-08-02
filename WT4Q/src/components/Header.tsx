"use client";

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import CategoryNavbar from './CategoryNavbar';
import SearchBar from './SearchBar';
import UserMenu from './UserMenu';
import WeatherWidget from './WeatherWidget';
import MenuIcon from './MenuIcon';
import styles from './Header.module.css';

export default function Header() {
  const [open, setOpen] = useState(false);

  return (
    <header className={styles.header}>
      {open && <div className={styles.overlay} onClick={() => setOpen(false)} />}
      <div className={styles.inner}>
        <div className={styles.left}>
          <Link
            href="/weather"
            aria-label="Weather details"
            className={styles.weather}
          >
            <WeatherWidget />
          </Link>
          <div className={styles.search}>
            <SearchBar />
          </div>
        </div>
        <Link href="/" className={styles.logo}>
          <Image
            src="/images/wt4q-logo.png"
            alt="WT4Q logo"
            width={0}
            height={0}
            sizes="3rem"
            className={styles.logoImage}
            priority
          />
        </Link>
        <div className={styles.right}>
          <button
            className={styles.menuButton}
            onClick={() => setOpen(true)}
            aria-label="Open categories"
          >
            <MenuIcon className={styles.menuIcon} />
          </button>
          <div className={styles.userMenu}>
            <UserMenu />
          </div>
        </div>
      </div>
      <div className={styles.categories}>
        <CategoryNavbar open={open} />
      </div>
    </header>
  );
}
