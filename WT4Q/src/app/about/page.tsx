import styles from './page.module.css';

export const metadata = {
  title: 'About WT4Q',
};

export default function AboutPage() {
  return (
    <div className={styles.container}>
      <h1 className={styles.title}>About WT4Q</h1>
      <p>
        WT4Q delivers reliable local and global coverage with a focus on
        accuracy, context, and community impact.
      </p>
      <p>
        In addition to news reporting, the site offers live weather updates,
        handy utilities, and a growing collection of casual games to keep you
        informed and entertained.
      </p>
      <p>
        We welcome feedback and story ideas from our readers. Visit the contact
        page to share your thoughts and help us improve WT4Q.
      </p>
    </div>
  );
}
