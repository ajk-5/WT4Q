'use client';
import { FC, useState, FormEvent, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import PrefetchLink from '@/components/PrefetchLink';
import Image from 'next/image';
import styles from './Login.module.css';
import Button from '@/components/Button';
import { API_ROUTES, apiFetch } from '@/lib/api';
import { setLoggedIn } from '@/lib/auth';

interface LoginRequest {
  email: string;
  password: string;
}

const EMAIL_REGEX = /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/;

interface Props {
  from?: string;
}

const LoginClient: FC<Props> = ({ from }) => {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
        const response = await apiFetch(API_ROUTES.AUTH.LOGIN, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password } as LoginRequest),
        });
        const data: { message?: string } = await response.json();

        if (!response.ok) {
          throw new Error(data.message || 'Login failed');
        }

        setLoggedIn(true);
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

  const fromPhotoshop = from === 'online-photoshop';

  // Page can scroll; box will not have its own scrollbar

  return (
    <main className={styles.container}>
      <section className={styles.card} aria-labelledby="user-login-title">
        <h1 id="user-login-title" className={styles.title}>
          User Login
        </h1>
        <div className={styles.ruleThick} aria-hidden="true" />
        <div className={styles.ruleThin} aria-hidden="true" />
        {fromPhotoshop && (
          <div role="alert" className={styles.banner}>
            Login to use free online Photoshop
          </div>
        )}
        {error && (
          <div role="alert" className={styles.error}>
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit} className={styles.form} noValidate>
          <div className={styles.field}>
            <label htmlFor="email" className={styles.visuallyHidden}>Email</label>
            <div className={styles.inputWrapper}>
              <span className={styles.inputIcon} aria-hidden="true">
                <svg viewBox="0 0 24 24" width="20" height="20">
                  <path d="M12 12c2.7 0 5-2.3 5-5s-2.3-5-5-5-5 2.3-5 5 2.3 5 5 5zm0 2c-3.3 0-10 1.7-10 5v3h20v-3c0-3.3-6.7-5-10-5z" fill="currentColor" />
                </svg>
              </span>
              <input
                id="email"
                type="email"
                autoComplete="username"
                autoFocus
                placeholder="Email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={styles.input}
                aria-invalid={!!emailError}
                aria-describedby={emailError ? 'email-error' : undefined}
              />
            </div>
            {emailError && (
              <p id="email-error" className={styles.fieldError} role="alert">
                {emailError}
              </p>
            )}
          </div>

          <div className={styles.field}>
            <label htmlFor="password" className={styles.visuallyHidden}>Password</label>
            <div className={styles.passwordWrapper}>
              <span className={styles.inputIcon} aria-hidden="true">
                <svg viewBox="0 0 24 24" width="20" height="20">
                  <path d="M7 14a5 5 0 1 1 4.9-6H22v3h-2v2h-2v2h-3.1A5 5 0 0 1 7 14zm0-2a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" fill="currentColor" />
                </svg>
              </span>
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
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
                aria-pressed={showPassword}
              >
                {showPassword ? (
                    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
                      <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6z" fill="none" stroke="currentColor" strokeWidth="2" />
                      <circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" strokeWidth="2" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
                      <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6z" fill="none" stroke="currentColor" strokeWidth="2" />
                      <line x1="3" y1="3" x2="21" y2="21" stroke="currentColor" strokeWidth="2" />
                    </svg>
                  )}
              </button>
            </div>
            <p className={styles.forgot}>
              <PrefetchLink href="/forgot-password" className={styles.switchLink}>
                Forgot password?
              </PrefetchLink>
            </p>
          </div>

          <Button type="submit" disabled={isLoading} className={styles.primaryButton}>
            {isLoading ? (
              <span className={styles.spinner} aria-hidden="true" />
            ) : (
              'Sign In'
            )}
          </Button>
        </form>
        <Button onClick={handleGoogleSignIn} className={styles.googleButton}>
          <Image
            src="/images/google.svg"
            alt="Google logo"
            width={18}
            height={18}
            className={styles.googleIcon}
          />
          <span>Sign in with Google</span>
        </Button>
        <p className={styles.switch}>
          Don&apos;t have an account?{' '}
          <PrefetchLink href="/register" className={styles.switchLink}>
            Register
          </PrefetchLink>
        </p>

      </section>
    </main>
  );
};

export default LoginClient;
