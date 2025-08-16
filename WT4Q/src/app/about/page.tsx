import styles from './page.module.css';

export const metadata = {
  title: 'About WT4Q',
};

export default function AboutPage() {
  return (
    <div className={styles.container}>
      <h1 className={styles.title}>About WT4Q</h1>
      <p>
        WT4Q is an independent project dedicated to delivering timely local and
        global news with clear context and a focus on community impact.
      </p>
      <p>
        Beyond reporting, we provide real-time weather updates, practical
        utilities, and light‑hearted games that make the site a useful companion
        throughout your day.
      </p>
      <p>
        Our small team believes that informed communities are strong communities.
        We welcome tips, corrections, and ideas from readers—visit the contact
        page to reach out and help us grow WT4Q.
      </p>
    </div>
  );
}
