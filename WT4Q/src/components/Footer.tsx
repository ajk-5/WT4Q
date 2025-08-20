import PrefetchLink from '@/components/PrefetchLink';
import styles from './Footer.module.css';

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        &copy; {new Date().getFullYear()} WT4Q News{' '}
        <span aria-hidden="true">|</span>{' '}
        <PrefetchLink href="/TERMS_AND_CONDITIONS.md">Terms &amp; Conditions</PrefetchLink>{' '}
        <span aria-hidden="true">|</span>{' '}
        <PrefetchLink href="/PRIVACY_POLICY.md">Privacy Policy</PrefetchLink>{' '}
        <span aria-hidden="true">|</span>{' '}
        <PrefetchLink href="/COOKIES_POLICY.md">Cookies Policy</PrefetchLink>{' '}
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
