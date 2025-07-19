'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import styles from './UserMenu.module.css';
import { API_ROUTES } from '@/lib/api';

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
    fetch(API_ROUTES.USERS.ME, { credentials: 'include' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setUser(data))
      .catch(() => setUser(null));
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
    await fetch(API_ROUTES.AUTH.LOGOUT, {
      method: 'POST',
      credentials: 'include',
    });
    router.refresh();
  };

  if (!user) {
    return (
      <Link href="/login" className={styles.loginLink}>
        Login
      </Link>
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
          <Link href="/profile" className={styles.item} onClick={() => setOpen(false)}>
            Profile
          </Link>
          <button onClick={handleLogout} className={styles.item}>
            Logout
          </button>
        </div>
      )}
    </div>
  );
}
