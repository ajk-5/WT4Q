"use client";

import { useCallback, useEffect, useRef, useState } from 'react';
import PrefetchLink from './PrefetchLink';
import CategoryNavbar from './CategoryNavbar';
import UserMenu from './UserMenu';
import WeatherWidget from './WeatherWidget';
import MenuIcon from './MenuIcon';
import NotificationBell from './NotificationBell';
import styles from './Header.module.css';
// Revert portal usage

export default function Header() {
  const SCROLL_ENTER_Y = 56;
  const SCROLL_EXIT_Y = 16;
  const headerRef = useRef<HTMLElement>(null);
  const reservedHeaderHeightRef = useRef(0);
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  // Render an empty dateline on the server to avoid hydration mismatch,
  // then compute on the client in a stable way (UTC timezone).
  const [dateline, setDateline] = useState('');
  useEffect(() => {
    try {
      const fmt = new Intl.DateTimeFormat('en-US', {
        weekday: 'short',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
        timeZone: 'UTC',
      });
      setDateline(fmt.format(new Date()));
    } catch {
      setDateline(new Date().toUTCString());
    }
  }, []);

  const handleNavigate = () => {
    if (window.innerWidth <= 1024) setOpen(false);
  };

  const updateHeaderOffset = useCallback(() => {
    if (typeof window === 'undefined') return;
    const height = headerRef.current?.offsetHeight ?? 0;
    if (height <= reservedHeaderHeightRef.current) return;

    // The header intentionally becomes compact while scrolling. The page
    // reserve must only grow, never shrink during that transition, otherwise
    // scroll anchoring can bounce around the threshold and visibly flicker.
    reservedHeaderHeightRef.current = Math.ceil(height);
    document.documentElement.style.setProperty(
      '--header-offset',
      `${reservedHeaderHeightRef.current}px`,
    );
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    updateHeaderOffset();

    const observer = 'ResizeObserver' in window ? new ResizeObserver(() => updateHeaderOffset()) : null;
    const target = headerRef.current;
    if (observer && target) observer.observe(target);

    const onResize = () => {
      reservedHeaderHeightRef.current = 0;
      updateHeaderOffset();
    };
    window.addEventListener('resize', onResize);

    return () => {
      window.removeEventListener('resize', onResize);
      if (observer) observer.disconnect();
    };
  }, [updateHeaderOffset]);

  useEffect(() => {
    let rafId = 0;

    const readScrollState = () => {
      const y = window.scrollY;
      // Use hysteresis so header/layout changes don't bounce the page
      // back and forth around a single threshold and cause flicker.
      setScrolled((prev) => {
        const next = prev ? y > SCROLL_EXIT_Y : y > SCROLL_ENTER_Y;
        return prev !== next ? next : prev;
      });
    };

    const onScroll = () => {
      if (rafId) return;
      rafId = window.requestAnimationFrame(() => {
        rafId = 0;
        readScrollState();
      });
    };

    // Run once in case we mount mid-page
    if (typeof window !== 'undefined') {
      readScrollState();
      window.addEventListener('scroll', onScroll, { passive: true });
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('scroll', onScroll);
        if (rafId) window.cancelAnimationFrame(rafId);
      }
    };
  }, []);

  // Reflect scrolled state as a root class for cross-component styling
  useEffect(() => {
    const root = document.documentElement;
    if (scrolled) {
      root.classList.add('header-scrolled');
    } else {
      root.classList.remove('header-scrolled');
    }
    updateHeaderOffset();

    return () => {
      root.classList.remove('header-scrolled');
    };
  }, [scrolled, updateHeaderOffset]);

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
          <div className={styles.dateline}>
            <span suppressHydrationWarning>{dateline}</span>
          </div>
          <PrefetchLink
            href="/weather"
            aria-label="Weather details"
            className={styles.weather}
          >
            <WeatherWidget showWind={false} />
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
