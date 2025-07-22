"use client";
import { useEffect, useState } from 'react';
import styles from './AgeGate.module.css';

interface AgeGateProps {
  storageKey: string;
  children: React.ReactNode;
}

export default function AgeGate({ storageKey, children }: AgeGateProps) {
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setVerified(localStorage.getItem(storageKey) === 'true');
  }, [storageKey]);

  const verify = () => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(storageKey, 'true');
    setVerified(true);
  };

  if (verified) return <>{children}</>;

  return (
    <div className={styles.gate}>
      <p className={styles.text}>You must be 18+ to view this content.</p>
      <button className={styles.button} onClick={verify} aria-label="confirm age">
        I am over 18
      </button>
    </div>
  );
}
