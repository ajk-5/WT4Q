"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import styles from "./bar.module.css";

export default function BackNav() {
  const router = useRouter();

  return (
    <div className={styles.navBar}>
      <button
        type="button"
        className={styles.navButton}
        onClick={() => router.back()}
        aria-label="Go back"
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <polyline points="15 18 9 12 15 6" />
        </svg>
        Back
      </button>

      <Link href="/bar" className={styles.navButton} aria-label="Go to bar home">
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M3 10.5 12 3l9 7.5" />
          <path d="M5 10v10h5v-6h4v6h5V10" />
        </svg>
        Bar home
      </Link>
    </div>
  );
}
