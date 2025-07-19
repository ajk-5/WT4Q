"use client";
import { useEffect, useState } from 'react';
import styles from './CookieBanner.module.css';

type CookiePrefs = {
  analytics: boolean;
};

export default function CookieBanner() {
  const [show, setShow] = useState(false);
  const [manage, setManage] = useState(false);
  const [prefs, setPrefs] = useState<CookiePrefs>({ analytics: true });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = localStorage.getItem('cookiePrefs');
    if (!stored) {
      setShow(true);
    } else {
      try {
        const parsed: CookiePrefs = JSON.parse(stored);
        setPrefs(parsed);
      } catch {
        setShow(true);
      }
    }
  }, []);

  const savePrefs = (p: CookiePrefs) => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('cookiePrefs', JSON.stringify(p));
    setShow(false);
    setManage(false);
  };

  const accept = () => savePrefs({ analytics: true });
  const refuse = () => savePrefs({ analytics: false });

  if (!show) return null;

  return (
    <div className={styles.banner}>
      {!manage ? (
        <div className={styles.message}>
          <p>
            WT4Q uses cookies to personalize content and analyze traffic.
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
          <div className={styles.actions}>
            <button className={styles.button} onClick={() => savePrefs(prefs)}>Save</button>
          </div>
        </div>
      )}
    </div>
  );
}
