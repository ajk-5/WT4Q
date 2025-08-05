import type { Metadata } from 'next';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: 'Home',
  alternates: { canonical: '/' },
  openGraph: {
    title: 'WT4Q News',
    url: '/',
    type: 'website',
  },
};

export default function Home() {
  return (
    <div className={styles.wrapper}>
      <header className={styles.header}>
        <div>VOL. 0123 | $12.00</div>
        <div>Tuesday, October 04, 2094</div>
      </header>

      <h1 className={styles.title}>The Tribune Times</h1>
      <h2 className={styles.subtitle}>Vehicula Iaculis Neque Volutput Ornare</h2>

      <div className={styles.main}>
        <div className={styles.column}>
          <h3>Lorem Ipsum Dolor Sit Amet Consetetur Domig Magna Rhoncusre</h3>
          <p><em>By Enim Dolor</em></p>
          <p>Lorem eget volutpat lorem urna tincidunt quam, lacinia enim dolor vellit neque...</p>
          <blockquote>&quot;Rhoncus urna magna semis velitis augue.&quot;</blockquote>
          <p>Morbi ut sapien ant ultrices turpis viverra...</p>
        </div>

        <div className={`${styles.column} ${styles.imageBox}`}>
          <img src="https://via.placeholder.com/250x250" alt="Protest image" />
          <div className={styles.caption}>Pulvinar urpis neque imperdiet commodo arcu massa vitae.</div>
          <blockquote>
            “Mauris velit arcu diam urna ornare, rhoncus consequat, imperdiet neque proinsi urna commodo quam.”
          </blockquote>
          <p>
            <span className={styles.bold}>Aenean Eu Aliquet Est Mauris Erat Purus, Cursusit</span>
            <br />
            <em>By Diam Neque</em>
          </p>
          <p>Amet facilisis eget, commodo at turpis...</p>
        </div>

        <div className={styles.column}>
          <h4>Pulvinar Arc Pellentesque Susip</h4>
          <p><em>By Nibh Mauris</em></p>
          <p>Cipit erat eget nibh. Lorem eget volutpat lorem urna tincidunt quam...</p>
          <p className={styles.pageRef}>Page 07</p>

          <h4>Ligula Nulla Proin Seddia Quam</h4>
          <p><em>By Diam Neque</em></p>
          <p>Vehicula, iaculi tellus vitae, ornare ar felis...</p>
          <p className={styles.pageRef}>Page 06</p>

          <h4>Mollis Vitae Mauris Vellit Neque</h4>
          <p><em>By Nibh Mauris</em></p>
          <p>sollicitudidit sep diam ornare rhoncus sed ullamcorper.</p>
          <p className={styles.pageRef}>Page 03</p>
        </div>
      </div>

      <footer className={styles.footer}>
        <div>35540</div>
        <div>85020</div>
      </footer>
    </div>
  );
}

