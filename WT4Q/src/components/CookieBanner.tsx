"use client";
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import styles from './CookieBanner.module.css';

type CookiePrefs = {
  analytics: boolean;
  ads: boolean;
  personalization: boolean;
};

export default function CookieBanner() {
  const pathname = usePathname();
  const [show, setShow] = useState(false);
  const [manage, setManage] = useState(false);
  const [prefs, setPrefs] = useState<CookiePrefs>({ analytics: true, ads: true, personalization: true });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = localStorage.getItem('cookiePrefs');
    if (!stored) {
      setShow(true);
    } else {
      try {
        const raw = JSON.parse(stored) as Partial<CookiePrefs>;
        const parsed: CookiePrefs = {
          analytics: raw.analytics ?? true,
          ads: raw.ads ?? true,
          personalization: raw.personalization ?? true,
        };
        setPrefs(parsed);
        // Apply saved consent on load
        applyConsent(parsed);
      } catch {
        setShow(true);
      }
    }
  }, []);

  const applyConsent = (p: CookiePrefs) => {
    if (typeof window === 'undefined') return;
    const status = (b: boolean) => (b ? 'granted' : 'denied');
    // Update Consent Mode v2 signals
    // ad_storage controls ads cookies; analytics_storage controls GA; ad_user_data/personalization for ads personalization
    try {
      type GtagFunction = (...args: unknown[]) => void;
      const gtag = (window as unknown as { gtag?: GtagFunction }).gtag;
      if (typeof gtag === 'function') {
        gtag('consent', 'update', {
          ad_storage: status(p.ads),
          analytics_storage: status(p.analytics),
          ad_user_data: status(p.ads),
          ad_personalization: status(p.personalization),
        });
      }
    } catch {}
  };

  const savePrefs = (p: CookiePrefs) => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('cookiePrefs', JSON.stringify(p));
    applyConsent(p);
    try {
      window.dispatchEvent(new CustomEvent<CookiePrefs>('cookiePrefsChanged', { detail: p }));
    } catch {}
    setShow(false);
    setManage(false);
  };

  const accept = () => savePrefs({ analytics: true, ads: true, personalization: true });
  const refuse = () => savePrefs({ analytics: false, ads: false, personalization: false });

  // Hide banner entirely on login/register pages to prevent viewport overlap/scroll
  if (pathname?.startsWith('/login') || pathname?.startsWith('/register')) return null;
  if (!show) return null;

  return (
    <div className={styles.banner}>
      {!manage ? (
        <div className={styles.message}>
          <p>
            The Nineties Times uses cookies for analytics and to deliver ads. You can choose how your data is used.
          </p>
          <div className={styles.actions}>
            <button className={styles.button} onClick={accept}>Accept</button>
            <button className={styles.button} onClick={() => setManage(true)}>Manage</button>
            <button className={styles.button} onClick={refuse}>Refuse</button>
          </div>
        </div>
      ) : (
        <div className={styles.manage}>
          <label>
            <input
              type="checkbox"
              checked={prefs.analytics}
              onChange={(e) =>
                setPrefs({ ...prefs, analytics: e.target.checked })
              }
            />
            Allow analytics cookies
          </label>
          <label>
            <input
              type="checkbox"
              checked={prefs.ads}
              onChange={(e) => setPrefs({ ...prefs, ads: e.target.checked })}
            />
            Allow ads cookies (ad_storage)
          </label>
          <label>
            <input
              type="checkbox"
              checked={prefs.personalization}
              onChange={(e) => setPrefs({ ...prefs, personalization: e.target.checked })}
            />
            Allow personalized ads (ad_personalization)
          </label>
          <div className={styles.actions}>
            <button className={styles.button} onClick={() => savePrefs(prefs)}>Save</button>
          </div>
        </div>
      )}
    </div>
  );
}
