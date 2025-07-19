'use client';
import { useEffect, useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import styles from './Profile.module.css';
import { API_ROUTES } from '@/lib/api';

interface User {
  userName: string;
  phone?: string;
  dob?: string;
}

export default function Profile() {
  const [user, setUser] = useState<User | null>(null);
  const [password, setPassword] = useState('');
  const router = useRouter();

  useEffect(() => {
    fetch(API_ROUTES.USERS.ME, { credentials: 'include' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setUser(data))
      .catch(() => setUser(null));
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;
    await fetch(API_ROUTES.USERS.UPDATE, {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userName: user.userName,
        phoneNumber: user.phone,
        dob: user.dob,
      }),
    });
    router.refresh();
  };

  const handleDelete = async () => {
    if (!password) return;
    if (!confirm('Delete account?')) return;
    await fetch(API_ROUTES.USERS.DELETE, {
      method: 'DELETE',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    router.replace('/');
  };

  if (!user) return <p className={styles.message}>Please log in</p>;

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <h1 className={styles.title}>Profile</h1>
      <label className={styles.label}>
        Name
        <input
          className={styles.input}
          value={user.userName}
          onChange={(e) => setUser({ ...user, userName: e.target.value })}
        />
      </label>
      <label className={styles.label}>
        Phone
        <input
          className={styles.input}
          value={user.phone || ''}
          onChange={(e) => setUser({ ...user, phone: e.target.value })}
        />
      </label>
      <label className={styles.label}>
        Date of birth
        <input
          type="date"
          className={styles.input}
          value={user.dob || ''}
          onChange={(e) => setUser({ ...user, dob: e.target.value })}
        />
      </label>
      <button type="submit" className={styles.button}>Save</button>
      <div className={styles.deleteSection}>
        <input
          type="password"
          placeholder="Password"
          className={styles.input}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button
          type="button"
          onClick={handleDelete}
          className={styles.deleteButton}
        >
          Delete account
        </button>
      </div>
    </form>
  );
}
