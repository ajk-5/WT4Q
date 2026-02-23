"use client";

import { useEffect, useState } from "react";
import styles from "@/app/born-in-the-90s/retro.module.css";
import type { ShowTrivia } from "@/lib/shows.types";
import { publicMediaUrl } from "@/lib/media";

type Props = {
  showTitle: string;
  trivias: ShowTrivia[];
  intervalMs?: number;
};

export default function ShowTriviaCarousel({ showTitle, trivias, intervalMs = 5000 }: Props) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!trivias.length) return undefined;
    const id = window.setInterval(() => {
      setIndex((prev) => (prev + 1) % trivias.length);
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [trivias.length, intervalMs]);

  if (!trivias.length) return null;
  const current = trivias[index];
  const imgSrc = current.imageUrl ? publicMediaUrl(current.imageUrl) : undefined;
  const imgAlt = current.text
    ? `${showTitle} trivia image on The Nineties Times (90sTimes): ${current.text}`
    : `${showTitle} trivia image on The Nineties Times (90sTimes)`;

  return (
    <section className={styles.triviaSection} aria-label={`${showTitle} trivia`}>
      <div className={styles.triviaCard}>
        <div className={styles.triviaMedia}>
          {imgSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imgSrc}
              alt={imgAlt}
              className={styles.triviaImage}
              onError={(e) => {
                const img = e.currentTarget;
                if (img.src.endsWith('/images/90stimeslogo.png.jpg')) return;
                img.src = '/images/90stimeslogo.png.jpg';
              }}
            />
          ) : (
            <div className={styles.triviaFallback}>
              <span className={styles.triviaBadge}>{showTitle}</span>
            </div>
          )}
        </div>
        <div className={styles.triviaBody}>
          <div className={styles.triviaHeader}>
            <span className={styles.triviaLabel}>{showTitle} trivia</span>
            <span className={styles.triviaIndex}>
              {index + 1}/{trivias.length}
            </span>
          </div>
          <p className={styles.triviaText}>{current.text}</p>
        </div>
      </div>
    </section>
  );
}
