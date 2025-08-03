import Link from 'next/link';
import styles from './Footer.module.css';

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        &copy; {new Date().getFullYear()} WT4Q News{' '}
        <span aria-hidden="true">|</span>{' '}
        <Link href="/terms">Terms &amp; Cookies</Link>{' '}
        <span aria-hidden="true">|</span>{' '}
        <Link href="/contact?type=problem">Report a Problem</Link>{' '}
        <span aria-hidden="true">|</span>{' '}
        <Link href="/contact">Contact Us</Link>
      </div>
    </footer>
  );
}
