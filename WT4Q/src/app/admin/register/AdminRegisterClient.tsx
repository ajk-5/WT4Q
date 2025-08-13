'use client';

import { useState, FormEvent, useTransition } from 'react';
import { API_ROUTES } from '@/lib/api';
import Button from '@/components/Button';
import styles from '../../admin-login/AdminLogin.module.css';

interface AdminRegisterRequest {
  adminName: string;
  email: string;
  password: string;
}

export default function AdminRegisterClient() {
  const [adminName, setAdminName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      try {
        const res = await fetch(API_ROUTES.ADMIN_AUTH.REGISTER, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ adminName, email, password } as AdminRegisterRequest),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data.message || 'Registration failed');
        }
        setSuccess('Admin registered');
        setAdminName('');
        setEmail('');
        setPassword('');
      } catch (err) {
        if (err instanceof Error) setError(err.message);
        else setError('Registration failed');
      }
    });
  };

  return (
    <main className={styles.container}>
      <section className={styles.card} aria-labelledby="admin-register-title">
        <h1 id="admin-register-title" className={styles.title}>
          Admin Registration
        </h1>
        {error && <p className={styles.error}>{error}</p>}
        {success && <p className={styles.success}>{success}</p>}
        <form onSubmit={handleSubmit} className={styles.form} noValidate>
          <div className={styles.field}>
            <label htmlFor="name" className={styles.label}>
              Name
            </label>
            <input
              id="name"
              type="text"
              required
              value={adminName}
              onChange={(e) => setAdminName(e.target.value)}
              className={styles.input}
            />
          </div>
          <div className={styles.field}>
            <label htmlFor="email" className={styles.label}>
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={styles.input}
            />
          </div>
          <div className={styles.field}>
            <label htmlFor="password" className={styles.label}>
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={styles.input}
            />
          </div>
          <Button type="submit" disabled={isPending}>
            {isPending ? 'Loading...' : 'Register'}
          </Button>
        </form>
      </section>
    </main>
  );
}
