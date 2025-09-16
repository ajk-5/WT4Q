'use client';

import { useEffect, useMemo } from 'react';
import { usePathname } from 'next/navigation';

const ADSENSE_SRC =
  'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-2858608482723109';

function ensureAdSenseLoaded(eager: boolean) {
  // Avoid duplicate injection
  if (typeof document === 'undefined') return;
  const existing = document.querySelector(`script[data-adsbygoogle="true"][src*="pagead2.googlesyndication.com/pagead/js/adsbygoogle.js"]`);
  if (existing) return;

  const load = () => {
    const s = document.createElement('script');
    s.async = true;
    s.src = ADSENSE_SRC;
    s.crossOrigin = 'anonymous';
    s.setAttribute('data-adsbygoogle', 'true');
    document.head.appendChild(s);
  };

  if (eager) {
    load();
  } else {
    // Use requestIdleCallback when available, otherwise fallback to setTimeout
    type RequestIdle = (cb: () => void) => number;
    const requestIdle: RequestIdle =
      typeof window !== 'undefined' && 'requestIdleCallback' in window
        ? (cb) => (window as Window & { requestIdleCallback: (cb: () => void) => number }).requestIdleCallback(cb)
        : (cb) => window.setTimeout(cb, 2500);
    requestIdle(load);
  }
}

export default function AdSenseLoader() {
  const pathname = usePathname();
  const isArticle = pathname?.startsWith('/articles/');
  const shouldLoad = useMemo(() => {
    if (typeof window === 'undefined') return false;
    try {
      const stored = localStorage.getItem('cookiePrefs');
      if (stored) {
        const prefs = JSON.parse(stored) as { ads?: boolean };
        if (prefs && prefs.ads === false) return false; // user refused ads
      }
    } catch {}
    // Load on article pages; skip site-wide idle loading to reduce bytes
    return !!isArticle;
  }, [isArticle]);

  useEffect(() => {
    if (shouldLoad) ensureAdSenseLoaded(false);
  }, [shouldLoad]);

  return null;
}

