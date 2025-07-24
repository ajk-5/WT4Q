import styles from './Hero.module.css';

export default function Hero() {
  return (
    <section className={styles.hero} aria-label="WT4Q introduction">
      <div className={styles.inner}>
        <h1 className={styles.title}>WT4Q News</h1>

      </div>
    </section>
  );
}
