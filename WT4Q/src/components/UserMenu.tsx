'use client';

import { useEffect, useState } from 'react';
import PrefetchLink from '@/components/PrefetchLink';
import { useRouter } from 'next/navigation';
import styles from './UserMenu.module.css';
import { API_ROUTES, apiFetch } from '@/lib/api';

interface User {
  id: string;
  userName: string;
  email: string;
}

export default function UserMenu() {
  const [user, setUser] = useState<User | null>(null);
  const [open, setOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    apiFetch(API_ROUTES.USERS.ME)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) {
          setUser(data);
          setLoggedIn(true);
        } else {
          setLoggedIn(false);
        }
      })
      .catch(() => {
        setUser(null);
        setLoggedIn(false);
      });
  }, []);

  const initials = user?.userName
    ? user.userName
        .split(/\s+/)
        .map((w) => w[0])
        .join('')
        .toUpperCase()
    : '';

  const handleLogout = async () => {
    if (!confirm('Log out?')) return;
    await apiFetch(API_ROUTES.AUTH.LOGOUT, {
      method: 'POST',
    });
    setUser(null);
    setLoggedIn(false);
    router.refresh();
  };

  if (!user) {
    return (
      <PrefetchLink href="/login" className={styles.loginLink}>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          className={styles.loginIcon}
          aria-hidden="true"
          focusable="false"
        >
          <path
            fill="currentColor"
            d="M12 12c2.7 0 5-2.3 5-5s-2.3-5-5-5-5 2.3-5 5 2.3 5 5 5zm0 2c-3.3 0-10 1.7-10 5v3h20v-3c0-3.3-6.7-5-10-5z"
          />
        </svg>
        <span className={styles.loginText}>Sign In</span>
      </PrefetchLink>
    );
  }

  return (
    <div className={styles.wrapper}>
      <button
        onClick={() => setOpen((o) => !o)}
        className={styles.icon}
        aria-label="User menu"
      >
        {initials}
      </button>
      {open && (
        <div className={styles.dropdown}>
          <PrefetchLink href="/profile" className={styles.item} onClick={() => setOpen(false)}>
            Profile
          </PrefetchLink>
          <button onClick={handleLogout} className={styles.item}>
            Logout
          </button>
        </div>
      )}
    </div>
  );
}
