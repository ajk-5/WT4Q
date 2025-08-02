'use client';
import { FC, useState, FormEvent, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import styles from './Register.module.css';
import Button from '@/components/Button';
import { API_ROUTES } from '@/lib/api';

interface RegisterRequest {
  username: string;
  email: string;
  phoneNumber?: string;
  password: string;
  confirmPassword: string;
  dob: string;
}

const EMAIL_REGEX = /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/;

const Register: FC = () => {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [dob, setDob] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [isPending, startTransition] = useTransition();
  const isLoading = isPending;

  const validate = (): boolean => {
    let valid = true;
    if (!EMAIL_REGEX.test(email)) {
      setEmailError('Please enter a valid email address');
      valid = false;
    } else {
      setEmailError(null);
    }
    return valid;
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    if (!validate()) return;

    startTransition(async () => {
      try {
        const response = await fetch(API_ROUTES.AUTH.REGISTER, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            username,
            email,
            phoneNumber: phone || undefined,
            password,
            confirmPassword,
            dob,
          } as RegisterRequest),
        });
        const data: { message?: string; Error?: string } = await response.json();
        if (!response.ok) {
          throw new Error(data.message || data.Error || 'Registration failed');
        }
        router.replace('/');
      } catch (err) {
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError('An unexpected error occurred');
        }
      }
    });
  };

  const handleGoogleSignIn = () => {
    const returnUrl = window.location.origin;
    window.location.href = `${API_ROUTES.GOOGLE_SIGN_IN.AUTH}?returnUrl=${encodeURIComponent(returnUrl)}`;
  };

  return (
    <main className={styles.container}>
      <section className={styles.card} aria-labelledby="register-title">
        <h1 id="register-title" className={styles.title}>
          Register
        </h1>
        {error && (
          <div role="alert" className={styles.error}>
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit} className={styles.form} noValidate>
          <div className={styles.field}>
            <label htmlFor="username" className={styles.label}>
              Username
            </label>
            <input
              id="username"
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
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
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={styles.input}
              aria-invalid={!!emailError}
              aria-describedby={emailError ? 'email-error' : undefined}
            />
            {emailError && (
              <p id="email-error" className={styles.fieldError} role="alert">
                {emailError}
              </p>
            )}
          </div>
          <div className={styles.field}>
            <label htmlFor="phone" className={styles.label}>
              Phone Number
            </label>
            <input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className={styles.input}
            />
          </div>
          <div className={styles.field}>
            <label htmlFor="dob" className={styles.label}>
              Date of Birth
            </label>
            <input
              id="dob"
              type="date"
              required
              value={dob}
              onChange={(e) => setDob(e.target.value)}
              className={styles.input}
            />
          </div>
          <div className={styles.field}>
            <label htmlFor="password" className={styles.label}>
              Password
            </label>
            <div className={styles.passwordWrapper}>
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={styles.input}
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className={styles.toggleButton}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
          </div>
          <div className={styles.field}>
            <label htmlFor="confirm-password" className={styles.label}>
              Confirm Password
            </label>
            <input
              id="confirm-password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={styles.input}
            />
          </div>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? (
              <span className={styles.spinner} aria-hidden="true" />
            ) : (
              'Register'
            )}
          </Button>
        </form>
        <Button onClick={handleGoogleSignIn}>Sign in with Google</Button>
        <p className={styles.switch}>
          Already have an account?{' '}
          <Link href="/login" className={styles.switchLink}>
            Sign In
          </Link>
        </p>
      </section>
    </main>
  );
};

export default Register;
