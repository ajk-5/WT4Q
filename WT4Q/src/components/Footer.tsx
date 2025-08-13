import PrefetchLink from '@/components/PrefetchLink';
import styles from './Footer.module.css';

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        &copy; {new Date().getFullYear()} WT4Q News{' '}
        <span aria-hidden="true">|</span>{' '}
        <PrefetchLink href="/terms">Terms &amp; Cookies</PrefetchLink>{' '}
        <span aria-hidden="true">|</span>{' '}
        <PrefetchLink href="/about">About</PrefetchLink>{' '}
        <span aria-hidden="true">|</span>{' '}
        <PrefetchLink href="/contact?type=problem">Report a Problem</PrefetchLink>{' '}
        <span aria-hidden="true">|</span>{' '}
        <PrefetchLink href="/contact">Contact Us</PrefetchLink>
      </div>
    </footer>
  );
}
