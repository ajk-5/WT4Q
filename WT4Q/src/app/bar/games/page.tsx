import type { Metadata } from "next";
import Link from "next/link";
import AgeGate from "@/components/AgeGate";
import GamesPanel from "../GamesPanel";
import styles from "../bar.module.css";

export const metadata: Metadata = {
  title: "Bar Games - The Nineties Times",
  description: "Coin flips, dice rolls, and quick party games for your next bar night.",
  alternates: { canonical: "/bar/games" },
};

export default function BarGamesPage() {
  return (
    <main className={styles.page}>
      <AgeGate storageKey="barVerified">
        <section className={styles.hero}>
          <div>
            <h1 className={styles.title}>Bar Games</h1>
            <p className={styles.subtitle}>
              Quick taps, friendly dares. Keep the drinks flowing and the games light.
            </p>
            <div className={styles.heroActions}>
              <Link href="/bar/wheel-of-fortune" className={styles.heroWheelLink}>
                Open Wheel of Cocktails
              </Link>
            </div>
          </div>
        </section>

        <GamesPanel />
      </AgeGate>
    </main>
  );
}
