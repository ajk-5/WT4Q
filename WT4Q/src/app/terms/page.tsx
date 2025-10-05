import type { Metadata } from 'next';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: 'Terms of Service & Cookie Policy | The Nineties Times',
  description:
    'Review the latest Terms of Service, community guidelines, and cookie policy for The Nineties Times (90sTimes), your hub for breaking news and analysis.',
  keywords: [
    'terms of service 2025',
    'cookie policy update',
    'user guidelines news site',
    'community standards',
    'The Nineties Times terms',
    '90sTimes legal',
    'content moderation policies',
  ],
  alternates: { canonical: '/terms' },
  openGraph: {
    title: 'The Nineties Times Terms & Cookie Policy',
    description:
      'Stay up to date on user responsibilities, content rules, and cookie usage across The Nineties Times network.',
    url: '/terms',
    type: 'article',
  },
  twitter: {
    card: 'summary',
    title: 'The Nineties Times Terms & Cookie Policy',
    description:
      'Learn about account rules, data usage, and advertising consent for readers and contributors at 90sTimes.',
  },
};

export default function TermsPage() {
  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Terms of Service &amp; Cookie Policy</h1>
      <p>
        Editorial independence: Our reporting is produced free of outside influence. We strive for accuracy, balance, and respect, without favor toward any political party, race, or group.
      </p>
      <p>
        Welcome to the summary of The Nineties Times&rsquo; Terms of Service and Cookie Policy.
        Visiting or using the site means you agree to the rules described here.
        This page highlights key points in plain language, but it is not a legal
        document. For the full text, please read the{' '}
        <a href="/TERMS_AND_CONDITIONS.md">Terms &amp; Conditions</a> and{' '}
        <a href="/COOKIES_POLICY.md">Cookies Policy</a> documents.
      </p>
      <h2 className={styles.heading}>Terms of Service Highlights</h2>
      <p>
        The Nineties Times is a community-driven project intended for informational and
        entertainment purposes. To keep things running smoothly we ask that you
        follow these guidelines:
      </p>
      <ul>
        <li>Use The Nineties Times only in ways that are lawful and respectful of others.</li>
        <li>Keep your login credentials secure and do not share accounts.</li>
        <li>Your submissions remain yours, but you grant us permission to publish them.</li>
        <li>Do not post material that is defamatory, discriminatory, or misleading.</li>
        <li>We may remove content or suspend accounts that violate these rules.</li>
        <li>External links are offered for convenience; we do not control those sites.</li>
        <li>Features may change or disappear as we improve the service.</li>
        <li>The Nineties Times is provided &quot;as is,&quot; without warranties about accuracy or availability.</li>
        <li>We are not liable for damages that result from your use of the site.</li>
        <li>Local laws govern these terms, and continued use after updates signifies acceptance.</li>
        <li>You are responsible for ensuring your contributions do not infringe intellectual property rights.</li>
        <li>If you stop using the service, obligations incurred while active, such as granted licenses, remain in effect.</li>
      </ul>
      <p>
        These points summarize your responsibilities and ours, but they cannot
        replace the precision of the full policy. If a disagreement arises, the
        written document will prevail.
      </p>
      <p>
        Features occasionally rely on third-party services like mapping or video
        hosts. Those services operate under their own terms, and your use of
        them is at your discretion. We aim to select reputable partners but
        cannot guarantee their performance or policies.
      </p>
      <h2 className={styles.heading}>Cookie Policy Summary</h2>
      <p>
        Cookies are small files that help us remember preferences and measure how
        the site is used. We use three main types:
      </p>
      <ul>
        <li>Essential cookies maintain security and core features like logins.</li>
        <li>Preference cookies store settings such as display options or saved locations.</li>
        <li>Analytics cookies collect anonymous statistics after you give consent.</li>
      </ul>
      <p>
        A banner on your first visit lets you accept or reject analytics cookies.
        You can revisit that banner, adjust your browser settings, or clear stored
        data to change your choice at any time. Refusing essential cookies may
        limit functionality. Learn more in the{' '}
        <a href="/COOKIES_POLICY.md">Cookies Policy</a>.
      </p>
      <p>
        We update our terms occasionally as laws change or new features launch.
        When we do, we post the revision date prominently. Continuing to use The Nineties Times
        after revisions means you agree to the updated rules, so check back
        periodically to stay informed.
      </p>
      <h2 className={styles.heading}>Crypto Market Data &amp; Disclaimers</h2>
      <p>
        The Crypto section aggregates prices, charts and rankings from
        third-party providers (including Binance and CoinGecko) and headlines
        from Google News RSS. This information is provided &quot;as-is&quot; for
        educational and informational purposes only. It is not investment
        advice, a solicitation, or a recommendation to buy or sell any asset.
      </p>
      <ul>
        <li>Data may be delayed, incomplete or incorrect. Availability is not guaranteed.</li>
        <li>We are not responsible for market losses incurred based on information displayed here.</li>
        <li>The site does not facilitate trading or hold customer funds.</li>
        <li>Use of third-party APIs is subject to those providers&rsquo; terms.</li>
      </ul>
      <h2 className={styles.heading}>Crypto Preferences &amp; Cookies</h2>
      <p>
        To improve usability, the Crypto pages may store non-essential
        preferences (such as a last selected symbol or timeframe) in cookies or
        local storage. These do not track you across sites and can be cleared in
        your browser at any time. Analytics/advertising cookies remain optional
        and controlled through our consent banner.
      </p>
      <p>
        If you have questions about any of these terms or how we handle cookies,
        please email <a href="mailto:wt4q.com@gmail.com">wt4q.com@gmail.com</a>
        {' '}or use the contact page. We value transparency and are happy to explain
        our practices.
      </p>
    </div>
  );
}
