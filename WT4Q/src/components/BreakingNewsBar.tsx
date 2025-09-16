"use client";

import { useEffect, useState } from 'react';
import BreakingNewsSlider from './BreakingNewsSlider';
import SearchBar from './SearchBar';
import styles from './BreakingNewsBar.module.css';

export default function BreakingNewsBar() {
  const [open, setOpen] = useState(false);

  // Open search by default on desktop when not scrolled
  useEffect(() => {
    const compute = () => {
      const isDesktop = window.innerWidth > 1024;
      const headerScrolled = document.documentElement.classList.contains('header-scrolled');
      setOpen(isDesktop && !headerScrolled);
    };
    compute();
    window.addEventListener('resize', compute);
    window.addEventListener('scroll', compute, { passive: true });
    return () => {
      window.removeEventListener('resize', compute);
      window.removeEventListener('scroll', compute);
    };
  }, []);

  return (
    <div className={styles.container} data-component="breaking-bar">
      <BreakingNewsSlider className={`${styles.bar} ${styles.grow}`} />
      <div className={styles.controls}>
        <button
          type="button"
          aria-label={open ? 'Close search' : 'Open search'}
          aria-pressed={open}
          className={styles.searchToggle}
          onClick={() => setOpen((o) => !o)}
          title={open ? 'Close search' : 'Search'}
        >
          {open ? (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              width="20"
              height="20"
              aria-hidden="true"
              focusable="false"
              className={styles.searchIcon}
            >
              <line x1="4" y1="4" x2="20" y2="20" />
              <line x1="20" y1="4" x2="4" y2="20" />
            </svg>
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              width="20"
              height="20"
              aria-hidden="true"
              focusable="false"
              className={styles.searchIcon}
            >
              <path
                d="M15.5 14h-.79l-.28-.27a6.471 6.471 0 0 0 1.57-4.23C16 6.01 12.99 3 9.5 3S3 6.01 3 9.5 6.01 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zM9.5 14C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"
                fill="none"
              />
            </svg>
          )}
        </button>
        <div className={styles.search} aria-hidden={!open}>
          <SearchBar />
        </div>
      </div>
    </div>
  );
}
