import styles from './page.module.css';

export const metadata = {
  title: 'Privacy Policy',
};

export default function PrivacyPage() {
  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Privacy Policy</h1>
      <p>
        This page summarizes how The Nineties Times collects and uses
        information. For the full policy text, please read the
        {' '}<a href="/PRIVACY_POLICY.md">Privacy Policy (full)</a>.
      </p>
      <h2 className={styles.heading}>Key Points</h2>
      <ul>
        <li>We use essential cookies for core site functionality.</li>
        <li>With your consent, we use analytics to understand usage.</li>
        <li>With your consent, we serve ads and may personalize ads.</li>
        <li>You can change your consent choices at any time via the cookie banner.</li>
      </ul>
      <p>
        If you have any questions about our privacy practices, contact us at
        {' '}<a href="mailto:privacy@90stimes.example.com">privacy@90stimes.example.com</a>.
      </p>
    </div>
  );
}

