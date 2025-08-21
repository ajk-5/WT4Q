import type { Metadata } from 'next';
import PrefetchLink from '@/components/PrefetchLink';
import QrMaker from '@/components/QrMaker';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: 'QR Code Scanner Online - Free Tool, No Sign Up',
  description: 'QR code scanner online no sign up or login required. Free to use.',
};

export default function QrCodeScannerPage() {
  return (
    <main className={styles.main}>
      <h1 className={styles.heading}>QR Code Scanner</h1>
      <QrMaker />
      <p className={styles.back}>
        <PrefetchLink href="/tools">Back to Tools</PrefetchLink>
      </p>
    </main>
  );
}
