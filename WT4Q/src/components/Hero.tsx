import styles from './Hero.module.css';

export default function Hero() {
  return (
    <section className={styles.hero} aria-label="The Nineties Times introduction">
      <div className={styles.inner}>
        <h1 className={styles.title}>The Nineties Times</h1>
      </div>
    </section>
  );
}
