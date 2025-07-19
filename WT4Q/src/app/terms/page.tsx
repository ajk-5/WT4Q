import styles from './page.module.css';

export const metadata = {
  title: 'Terms & Cookie Policy',
};

export default function TermsPage() {
  return (
    <div className={styles.container}>
      <h1>Terms and Conditions &amp; Cookie Policy</h1>
      <p>
        This page summarizes how WT4Q handles cookies and outlines the basic
        terms of use. Cookies are used in accordance with EU Regulation RSPD.
      </p>
      <h2>Terms of Use</h2>
      <ul>
        <li>Content is provided for informational purposes only.</li>
        <li>Do not use the service for unlawful activities.</li>
        <li>WT4Q may modify or discontinue the service without notice.</li>
        <li>Use the service at your own risk.</li>
      </ul>
      <h2>Cookie Policy</h2>
      <p>
        WT4Q stores essential and analytics cookies to operate and improve the
        site. You may manage your cookie preferences in your browser settings.
      </p>
    </div>
  );
}
