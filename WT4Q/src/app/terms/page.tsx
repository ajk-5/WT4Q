import styles from './page.module.css';

export const metadata = {
  title: 'Terms & Cookie Policy',
};

export default function TermsPage() {
  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Terms and Conditions &amp; Cookie Policy</h1>
      <p>
        By using WT4Q you agree to the following terms. These summaries are
        provided for convenience and do not replace the full policy.
      </p>
      <h2 className={styles.heading}>Terms of Use</h2>
      <ul>
        <li>Content is for informational purposes only and may change.</li>
        <li>You agree not to use the service for unlawful activities.</li>
        <li>WT4Q may modify or discontinue the service without notice.</li>
        <li>The service is provided &quot;as is&quot; without warranties.</li>
      </ul>
      <h2 className={styles.heading}>Cookie Policy</h2>
      <p>
        WT4Q uses essential cookies for basic functionality and optional
        analytics cookies to improve the site. On your first visit you can
        accept, manage or refuse these cookies via the banner shown at the
        bottom of the page. You can update your preference at any time by
        clearing browser storage.
      </p>
    </div>
  );
}
