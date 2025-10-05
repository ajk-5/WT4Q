import type { Metadata } from 'next';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: 'Privacy Policy | The Nineties Times',
  description:
    "Understand how The Nineties Times (90sTimes) protects reader data, manages cookies, and stays compliant with GDPR, CCPA, and global privacy standards.",
  keywords: [
    'privacy policy 2025',
    'GDPR compliance news site',
    'CCPA data rights',
    'cookie consent management',
    'secure news platform',
    'The Nineties Times privacy',
    '90sTimes data protection',
  ],
  alternates: { canonical: '/privacy' },
  openGraph: {
    title: 'The Nineties Times Privacy Policy',
    description:
      'See how The Nineties Times safeguards your personal data, manages analytics, and honors opt-out requests across the globe.',
    url: '/privacy',
    type: 'article',
  },
  twitter: {
    card: 'summary',
    title: 'The Nineties Times Privacy Policy',
    description:
      'Review our updated privacy terms, cookie consent details, and reader data protections for 2025.',
  },
};

export default function PrivacyPage() {
  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Privacy Policy</h1>
      <p>
        This page summarizes how The Nineties Times collects and uses
        information. For the full policy text, please read the{' '}
        <a href="/PRIVACY_POLICY.md">Privacy Policy (full)</a>.
      </p>
      <h2 className={styles.heading}>Key Points</h2>
      <ul>
        <li>We use essential cookies for core site functionality.</li>
        <li>With your consent, we use analytics to understand usage.</li>
        <li>With your consent, we serve ads and may personalize ads.</li>
        <li>You can change your consent choices at any time via the cookie banner.</li>
      </ul>
      <h2 className={styles.heading}>Crypto Features &amp; Third-Party Sources</h2>
      <p>
        Our Crypto section displays market data and news for educational and
        informational purposes. Prices, volumes and charts are sourced from
        third-party providers (e.g., Binance for USDT trading pairs, CoinGecko
        for market-cap rankings, and Google News RSS for related headlines).
        We cache small portions of this data briefly to improve performance and
        reduce load on upstream APIs. We do not collect personal data from
        those providers about you.
      </p>
      <ul>
        <li>No trading or brokerage services are offered on this site.</li>
        <li>Market data can be delayed or unavailable; accuracy is not guaranteed.</li>
        <li>Nothing on the site constitutes financial advice.</li>
      </ul>
      <h2 className={styles.heading}>Cookies &amp; Local Storage in Crypto Tools</h2>
      <p>
        The Crypto pages may store basic preferences (e.g., last viewed
        timeframe or selected symbol) in your browser using cookies or local
        storage. These settings are optional, device-scoped, and are used only
        to improve your experience. You can clear them at any time in your
        browser. Analytics and advertising cookies remain opt-in via our banner.
      </p>
      <p>
        If you have any questions about our privacy practices, contact us at{' '}
        <a href="mailto:wt4q.com@gmail.com">wt4q.com@gmail.com</a>.
      </p>
    </div>
  );
}

