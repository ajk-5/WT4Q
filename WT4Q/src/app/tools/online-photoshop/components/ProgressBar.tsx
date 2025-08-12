'use client';
import React from 'react';
import styles from '../styles/editor.module.css';

export default function ProgressBar({ value, label }: { value: number; label: string }) {
  return (
    <div className={styles.progressItem}>
      <div className={styles.progressLabel}>{label}</div>
      <div className={styles.progressTrack}>
        <div className={styles.progressFill} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
      </div>
    </div>
  );
}
