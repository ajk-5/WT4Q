import styles from './page.module.css';

export const metadata = {
  title: 'About WT4Q',
};

export default function AboutPage() {
  return (
    <div className={styles.container}>
      <h1 className={styles.title}>About WT4Q</h1>
      <p>
        WT4Q is your source for local and global news, providing timely updates
        and in-depth stories that matter to our community.
      </p>
      <p>
        Our team is dedicated to accurate reporting and thoughtful commentary.
        We strive to highlight diverse voices and perspectives from around the
        region.
      </p>
      <p>
        Have feedback or story ideas? We&apos;d love to hear from you. Reach out via
        our contact page and help us make WT4Q even better.
      </p>
    </div>
  );
}
