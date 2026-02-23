'use client';

import { useState } from 'react';
import styles from './ShareButtons.module.css';

export default function ShareButtons({
  url,
  title,
  size = 'sm',
}: {
  url: string;
  title: string;
  size?: 'sm' | 'md';
}) {
  const [copied, setCopied] = useState(false);

  const shareLinks = {
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
    x: `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
    reddit: `https://www.reddit.com/submit?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}`,
  } as const;

  const tryNativeShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title, url });
        return true;
      }
    } catch {}
    return false;
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  // Social links open via anchors to avoid popup blockers

  const dim = size === 'md' ? 20 : 16;

  return (
    <div className={styles.container}>
      <button className={styles.button} onClick={tryNativeShare} aria-label="Share">
        <svg className={styles.icon} width={dim} height={dim} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7a3.27 3.27 0 000-1.39l7.02-4.11A3 3 0 0018 7.91a3.09 3.09 0 10-3.09-3.09A3 3 0 0015 6.09l-7.1 4.16a3.09 3.09 0 100 3.5L15 17.91A3 3 0 0015 20a3.09 3.09 0 103.09-3.91z"/>
        </svg>
        <span className={styles.label}>Share</span>
      </button>
      <a className={styles.button} href={shareLinks.facebook} target="_blank" rel="noopener noreferrer" aria-label="Share on Facebook">
        <svg className={styles.icon} width={dim} height={dim} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <path d="M22 12.06C22 6.49 17.52 2 11.94 2 6.37 2 2 6.49 2 12.06 2 17.08 5.66 21.24 10.44 22v-7.02H7.9v-2.9h2.54V9.41c0-2.5 1.49-3.89 3.77-3.89 1.09 0 2.23.2 2.23.2v2.45h-1.25c-1.23 0-1.62.77-1.62 1.56v1.87h2.76l-.44 2.9h-2.32V22C18.34 21.24 22 17.08 22 12.06z"/>
        </svg>
        <span className={styles.label}>Facebook</span>
      </a>
      <a className={styles.button} href={shareLinks.x} target="_blank" rel="noopener noreferrer" aria-label="Share on X">
        <svg className={styles.icon} width={dim} height={dim} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <path d="M3 3h4.6l5.5 7.7L19.1 3H22l-7.7 9.8L22 21h-4.6l-5.9-8.2L5 21H2l8.1-10.3L3 3z"/>
        </svg>
        <span className={styles.label}>X</span>
      </a>
      <a className={styles.button} href={shareLinks.linkedin} target="_blank" rel="noopener noreferrer" aria-label="Share on LinkedIn">
        <svg className={styles.icon} width={dim} height={dim} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <path d="M4.98 3.5C4.98 4.6 4.1 5.5 3 5.5s-2-.9-2-2 .9-2 2-2 1.98.9 1.98 2zM3 8h2v13H3zM8 8h2v1.8h.03c.28-.5.98-1.3 2.27-1.3 2.44 0 2.9 1.6 2.9 3.7V21h-2v-6.2c0-1.48-.03-3.38-2.06-3.38-2.06 0-2.37 1.6-2.37 3.27V21H8z"/>
        </svg>
        <span className={styles.label}>LinkedIn</span>
      </a>
      <a className={styles.button} href={shareLinks.reddit} target="_blank" rel="noopener noreferrer" aria-label="Share on Reddit">
        <svg className={styles.icon} width={dim} height={dim} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <path d="M14.5 15.5c.62 0 1.12.5 1.12 1.12 0 .61-.5 1.11-1.12 1.11-.61 0-1.11-.5-1.11-1.11 0-.62.5-1.12 1.11-1.12zM9.5 15.5c.61 0 1.11.5 1.11 1.12 0 .61-.5 1.11-1.11 1.11-.62 0-1.12-.5-1.12-1.11 0-.62.5-1.12 1.12-1.12zM21 12c0-1.65-1.35-3-3-3-.68 0-1.3.23-1.79.61-1.16-.72-2.63-1.18-4.21-1.26l.66-3.09 2.15.46c0 1.11.9 2.01 2.01 2.01 1.11 0 2.01-.9 2.01-2.01s-.9-2.01-2.01-2.01c-.8 0-1.48.47-1.81 1.14l-2.56-.55c-.22-.05-.44.1-.49.32l-.77 3.59c-1.64.06-3.14.52-4.35 1.27A2.98 2.98 0 006 9c-1.65 0-3 1.35-3 3 0 .92.41 1.74 1.06 2.29-.02.15-.03.31-.03.46 0 2.49 3.13 4.5 7 4.5s7-2.01 7-4.5c0-.15-.01-.31-.03-.46.65-.55 1.06-1.37 1.06-2.29z"/>
        </svg>
        <span className={styles.label}>Reddit</span>
      </a>
      <button className={styles.button} onClick={copy} aria-label="Copy link">
        <svg className={styles.icon} width={dim} height={dim} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <path d="M16 1H4c-1.1 0-2 .9-2 2v12h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
        </svg>
        <span className={styles.label}>Copy</span>
      </button>
      {copied && <span className={styles.copyToast}>Copied!</span>}
    </div>
  );
}
