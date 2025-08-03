"use client";
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './AgeGate.module.css';

interface AgeGateProps {
  storageKey: string;
  children: React.ReactNode;
}

export default function AgeGate({ storageKey, children }: AgeGateProps) {
  const [verified, setVerified] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setVerified(localStorage.getItem(storageKey) === 'true');
  }, [storageKey]);

  const verify = () => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(storageKey, 'true');
    setVerified(true);
  };

  const reject = () => {
    if (typeof window === 'undefined') return;
    router.push('/');
  };

  if (verified) return <>{children}</>;

  return (
    <div className={styles.gate}>
      <p className={styles.text}>You must be 18+ to view this content.</p>
      <div className={styles.buttons}>
        <button
          className={styles.button}
          onClick={verify}
          aria-label="confirm age"
        >
          I am over 18
        </button>
        <button
          className={styles.button}
          onClick={reject}
          aria-label="reject age"
        >
          I am under 18
        </button>
      </div>
    </div>
  );
}
