import styles from './Footer.module.css';

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        &copy; {new Date().getFullYear()} WT4Q News
      </div>
    </footer>
  );
}
