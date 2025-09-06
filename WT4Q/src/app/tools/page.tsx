import { Metadata } from 'next';
import PrefetchLink from '@/components/PrefetchLink';
import styles from './Tools.module.css';

export const metadata: Metadata = {
  title: 'Tools',
  description:
    'Handy utilities including a meme generator, a world clock, and a free QR code scanner.',
};

export default function ToolsPage() {
  return (
    <main className={styles.main}>
      <h1>Tools</h1>
      <ul className={styles.list}>
        <li className={styles.item}>
          <PrefetchLink
            href="/tools/world-clock"
            title="World Clock — current times around the globe"
            className={styles.blockLink}
          >
            World Clock
          </PrefetchLink>
        </li>
        <li className={styles.item}>
          <PrefetchLink
            href="/tools/mememaker"
            title="MemeMaker — create custom memes"
            className={styles.blockLink}
          >
            Mememaker
          </PrefetchLink>
        </li>
        <li className={styles.item}>
          <PrefetchLink
            href="/tools/qr-code-generator"
            title="QR Code Generator — free online tool, no sign up or login required"
            className={styles.blockLink}
          >
            QR Code Scanner
          </PrefetchLink>
        </li>
        <li className={styles.item}>
          <PrefetchLink
            href="/tools/typing-practice"
            title="Typing Practice — test and improve your speed"
            className={styles.blockLink}
          >
            Typing Practice
          </PrefetchLink>
        </li>
      </ul>
    </main>
  );
}

