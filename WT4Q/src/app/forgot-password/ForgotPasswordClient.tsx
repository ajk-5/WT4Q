'use client';

import { useState, FormEvent } from 'react';
import PrefetchLink from '@/components/PrefetchLink';
import styles from './ForgotPassword.module.css';
import { API_ROUTES } from '@/lib/api';

export default function ForgotPasswordClient() {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const handleSendOtp = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    const res = await fetch(
      `${API_ROUTES.OTP.FORGOT_PASSWORD.GET}?Email=${encodeURIComponent(email)}`
    );
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      setMessage(data.message || 'OTP sent');
      setStep(2);
    } else {
      setError(data.message || 'Failed to send OTP');
    }
  };

  const handleResetPassword = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    const url = `${API_ROUTES.OTP.FORGOT_PASSWORD.POST}?Email=${encodeURIComponent(
      email
    )}&enteredotp=${encodeURIComponent(otp)}&Password=${encodeURIComponent(
      newPassword
    )}&ConfirmPassword=${encodeURIComponent(confirmPassword)}`;
    const res = await fetch(url, { method: 'POST' });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      setMessage('Password changed successfully');
      setStep(3);
    } else {
      setError(data.message || 'Failed to change password');
    }
  };

  return (
    <main className={styles.container}>
      {step === 1 && (
        <form onSubmit={handleSendOtp} className={styles.form}>
          <h1 className={styles.title}>Forgot Password</h1>
          {error && <p className={styles.error}>{error}</p>}
          {message && <p className={styles.success}>{message}</p>}
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className={styles.input}
          />
          <button type="submit" className={styles.button}>
            Send OTP
          </button>
        </form>
      )}

      {step === 2 && (
        <form onSubmit={handleResetPassword} className={styles.form}>
          <h1 className={styles.title}>Reset Password</h1>
          {error && <p className={styles.error}>{error}</p>}
          {message && <p className={styles.success}>{message}</p>}
          <input
            type="text"
            placeholder="OTP"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            required
            className={styles.input}
          />
          <input
            type="password"
            placeholder="New password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            className={styles.input}
          />
          <input
            type="password"
            placeholder="Confirm password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            className={styles.input}
          />
          <button type="submit" className={styles.button}>
            Reset Password
          </button>
        </form>
      )}

      {step === 3 && (
        <div className={styles.form}>
          {message && <p className={styles.success}>{message}</p>}
          <PrefetchLink href="/login" className={styles.link}>
            Return to login
          </PrefetchLink>
        </div>
      )}
    </main>
  );
}

