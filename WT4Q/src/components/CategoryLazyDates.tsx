"use client";

import { useEffect, useRef, useState } from "react";
import type { Article } from "@/components/ArticleCard";
import CategoryArticleCard from "@/components/CategoryArticleCard";
import HorizontalScroller from "@/components/HorizontalScroller";

type Props = {
  pastDates: string[];
  grouped: Record<string, Article[]>;
  sectionClassName: string;
  dateHeadingClassName: string;
  horizontalCardsClassName: string;
};

export default function CategoryLazyDates({
  pastDates,
  grouped,
  sectionClassName,
  dateHeadingClassName,
  horizontalCardsClassName,
}: Props) {
  const [visibleCount, setVisibleCount] = useState(Math.min(2, pastDates.length));
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!('IntersectionObserver' in window)) return;
    const el = sentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setVisibleCount((c) => Math.min(pastDates.length, c + 2));
          }
        }
      },
      { rootMargin: "400px 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [pastDates.length]);

  const visibleDates = pastDates.slice(0, visibleCount);

  return (
    <>
      {visibleDates.map((dateStr) => (
        <section key={dateStr} className={sectionClassName}>
          <h2 className={dateHeadingClassName}>
            {new Date(dateStr).toLocaleDateString('en-GB', {
              weekday: 'long',
              day: '2-digit',
              month: 'long',
              year: 'numeric',
            })}
          </h2>
          <HorizontalScroller
            className={horizontalCardsClassName}
            ariaLabel={`${dateStr} news scroller`}
          >
            {(grouped[dateStr] || []).map((a) => (
              <CategoryArticleCard key={a.id} article={a} />
            ))}
          </HorizontalScroller>
        </section>
      ))}

      {visibleCount < pastDates.length && (
        <div ref={sentinelRef} aria-hidden="true" />
      )}
    </>
  );
}

