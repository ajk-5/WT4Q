'use client';

import { useEffect, useRef } from 'react';

type CookiePrefs = {
  analytics: boolean;
  ads?: boolean;
  personalization?: boolean;
};

function loadGAScript(id: string) {
  if (typeof document === 'undefined') return;
  if (document.querySelector(`script[src*="gtag/js?id=${id}"]`)) return;
  const s = document.createElement('script');
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`;
  document.head.appendChild(s);
}

export default function GoogleAnalyticsLoader() {
  const loaded = useRef(false);
  const GA_ID = 'G-0NKNBEMWC2';

  useEffect(() => {
    function initGA() {
      if (loaded.current) return;
      loaded.current = true;
      // gtag bootstrap (dataLayer is already defined in consent-default)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const w = window as any;
      w.dataLayer = w.dataLayer || [];
      function gtag(...args: unknown[]) { w.dataLayer.push(args); }
      w.gtag = w.gtag || gtag;
      w.gtag('js', new Date());
      w.gtag('config', GA_ID);
      loadGAScript(GA_ID);
    }

    // If user has already granted analytics, initialize immediately
    try {
      const stored = localStorage.getItem('cookiePrefs');
      if (stored) {
        const prefs = JSON.parse(stored) as CookiePrefs;
        if (prefs.analytics) initGA();
      }
    } catch { /* ignore */ }

    // Listen for consent changes from CookieBanner
    const onPrefs = (e: Event) => {
      const ce = e as CustomEvent<CookiePrefs>;
      if (ce.detail?.analytics) initGA();
    };
    window.addEventListener('cookiePrefsChanged', onPrefs as EventListener);
    return () => window.removeEventListener('cookiePrefsChanged', onPrefs as EventListener);
  }, []);

  return null;
}

