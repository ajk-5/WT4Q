"use client";

import { useEffect, useRef, useState } from 'react';
import PrefetchLink from './PrefetchLink';
import CategoryNavbar from './CategoryNavbar';
import UserMenu from './UserMenu';
import WeatherWidget from './WeatherWidget';
import MenuIcon from './MenuIcon';
import NotificationBell from './NotificationBell';
import styles from './Header.module.css';
// Revert portal usage

export default function Header() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const headerRef = useRef<HTMLElement | null>(null);
  const dateline = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const handleNavigate = () => {
    if (window.innerWidth <= 1024) setOpen(false);
  };

  useEffect(() => {
    const onScroll = () => {
      const isScrolled = window.scrollY > 40;
      // Update only when state actually changes to avoid re-renders
      setScrolled((prev) => (prev !== isScrolled ? isScrolled : prev));
    };

    // Run once in case we mount mid-page
    if (typeof window !== 'undefined') {
      onScroll();
      window.addEventListener('scroll', onScroll, { passive: true });
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('scroll', onScroll);
      }
    };
  }, []);

  // Measure header height to offset page content below fixed header
  useEffect(() => {
    const updateHeight = () => {
      const h = headerRef.current?.offsetHeight || 0;
      if (h > 0) {
        document.documentElement.style.setProperty('--header-height', `${h}px`);
      }
    };
    updateHeight();
    // Observe size changes for dynamic elements (e.g., categories show/hide)
    let ro: ResizeObserver | null = null;
    if (typeof window !== 'undefined' && 'ResizeObserver' in window && headerRef.current) {
      ro = new ResizeObserver(() => updateHeight());
      ro.observe(headerRef.current);
    }
    window.addEventListener('resize', updateHeight);
    return () => {
      ro?.disconnect();
      window.removeEventListener('resize', updateHeight);
    };
  }, [scrolled]);

  // Reflect scrolled state as a root class for cross-component styling
  useEffect(() => {
    const root = document.documentElement;
    if (scrolled) {
      root.classList.add('header-scrolled');
    } else {
      root.classList.remove('header-scrolled');
    }
  }, [scrolled]);

  // No portal: rely on CSS to show/hide the sidebar when scrolled/mobile

  return (
    <header ref={headerRef} className={`${styles.header} ${scrolled ? styles.scrolled : ''}`}>
      {open && <div className={styles.overlay} onClick={() => setOpen(false)} />}
      <div className={styles.inner}>
        {/* Mobile menu button at top-left */}
        <button
          className={styles.menuButtonLeft}
          onClick={() => setOpen((o) => !o)}
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-pressed={open}
        >
          <MenuIcon className={styles.menuIcon} open={open} />
        </button>
        <PrefetchLink href="/" className={styles.logo} aria-label="Go to homepage">
          <span className={styles.masthead} aria-label="The Nineties Times">
            The Nineties Times
          </span>
        </PrefetchLink>
        <div className={styles.infoRow}>
          <div className={styles.dateline}>{dateline}</div>
          <PrefetchLink
            href="/weather"
            aria-label="Weather details"
            className={styles.weather}
          >
            <WeatherWidget />
          </PrefetchLink>
        </div>
        <div className={styles.actions}>
          <NotificationBell />
          <div className={styles.userMenu}>
            <UserMenu />
          </div>
        </div>
        {/* Search moved to BreakingNewsBar below the masthead */}
      </div>
      {/* Newspaper-style rules at the bottom of the header */}
      <div className={styles.ruleThick} aria-hidden="true" />
      <div className={styles.ruleThin} aria-hidden="true" />
      <div className={`${styles.categories} ${open ? styles.showSidebar : ''}`}>
        <CategoryNavbar open={open} onNavigate={handleNavigate} forceSidebar={scrolled} />
      </div>
   

    </header>
  );
}
