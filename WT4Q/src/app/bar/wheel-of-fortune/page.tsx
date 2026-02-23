import type { Metadata } from "next";
import AgeGate from "@/components/AgeGate";
import WheelClient from "./WheelClient";
import styles from "../bar.module.css";
import BackNav from "../BackNav";

export const metadata: Metadata = {
  title: "Cocktail Wheel of Fortune - The Nineties Bar",
  description:
    "Build a personalised wheel of cocktails from your recipes and spin it to decide the next drink for your party.",
  alternates: { canonical: "/bar/wheel-of-fortune" },
  openGraph: {
    title: "Cocktail Wheel of Fortune - The Nineties Bar",
    description:
      "Select cocktails from your bar menu and let the wheel choose the next round.",
    url: "/bar/wheel-of-fortune",
    type: "website",
  },
};

export const dynamic = "force-dynamic";

export default function WheelOfFortunePage() {
  return (
    <main className={styles.page}>
      <AgeGate storageKey="barVerified">
        <BackNav />
        <WheelClient />
      </AgeGate>
    </main>
  );
}
