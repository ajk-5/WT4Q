import type { Metadata } from "next";
import AgeGate from "@/components/AgeGate";
import { API_ROUTES } from "@/lib/api";
import BarClient, { Cocktail } from "./BarClient";
import styles from "./bar.module.css";
import {
  DEFAULT_OG_IMAGE,
  SITE_NAME,
  canonicalFor,
  defaultOpenGraph,
  robotsDirectives,
} from "@/lib/seo";

export const metadata: Metadata = {
  title: `Bar & Cocktail Lounge - ${SITE_NAME}`,
  description:
    "Discover curated cocktail recipes, a wheel-of-fortune drink picker, and bar-night party games for cozy soirees and late-night gatherings.",
  alternates: { canonical: canonicalFor("/bar") },
  openGraph: {
    ...defaultOpenGraph,
    title: `Bar & Cocktail Lounge - ${SITE_NAME}`,
    description:
      "Explore signature cocktails, mini bar games, and a wheel to choose your next drink.",
    url: canonicalFor("/bar"),
    type: "website",
    images: defaultOpenGraph.images ?? [{ url: DEFAULT_OG_IMAGE }],
  },
  twitter: {
    card: "summary_large_image",
    title: `Bar & Cocktail Lounge - ${SITE_NAME}`,
    description:
      "Explore signature cocktails, mini bar games, and a wheel to choose your next drink.",
    images: [DEFAULT_OG_IMAGE],
  },
  robots: robotsDirectives,
};

// Keep cocktails fresh and avoid failing builds if the API is slow
export const dynamic = "force-dynamic";

async function fetchInitialCocktails(): Promise<Cocktail[]> {
  try {
    const res = await fetch(API_ROUTES.COCKTAIL.GET_ALL, {
      cache: "no-store",
    });
    if (!res.ok) return [];
    const data = (await res.json()) as Cocktail[] | null;
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export default async function BarPage() {
  const initialCocktails = await fetchInitialCocktails();

  return (
    <main className={styles.pageShell}>
      <AgeGate storageKey="barVerified">
        <BarClient initialCocktails={initialCocktails} />
      </AgeGate>
    </main>
  );
}
