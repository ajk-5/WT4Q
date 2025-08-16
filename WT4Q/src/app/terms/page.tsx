import styles from './page.module.css';

export const metadata = {
  title: 'Terms of Service & Cookie Policy',
};

export default function TermsPage() {
  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Terms of Service &amp; Cookie Policy</h1>
      <p>
        Using WT4Q means you accept our terms and acknowledge how we use
        cookies. The following is a brief summary; please refer to the full{' '}
        <a href="/TERMS_AND_COOKIE_POLICY.md">policy document</a> for complete
        details.
      </p>
      <h2 className={styles.heading}>Terms of Service</h2>
      <ul>
        <li>Use WT4Q only for lawful purposes.</li>
        <li>Content is provided &quot;as is&quot; without warranties or guarantees.</li>
        <li>We may modify or discontinue features at any time.</li>
        <li>WT4Q is not liable for damages arising from use of the service.</li>
      </ul>
      <h2 className={styles.heading}>Cookie Policy</h2>
      <p>
        We use essential cookies for core functionality and optional analytics
        cookies to help improve the site. A banner on your first visit lets you
        accept all cookies or reject analytics cookies. You can change your
        choice later through the banner or your browser settings.
      </p>
    </div>
  );
}
