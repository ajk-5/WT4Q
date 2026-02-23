"use client";

import { useEffect, useState } from "react";

type Props = {
  slug: string;
  className?: string;
};

type StoredResult = {
  correct?: number;
  total?: number;
  points?: number;
  totalPoints?: number;
  percent?: number;
  rankLabel?: string;
};

export default function QuizBestScore({ slug, className }: Props) {
  const [best, setBest] = useState<StoredResult | null>(null);

  useEffect(() => {
    try {
      const key = `quiz-${slug}-result`;
      const raw = typeof window !== "undefined" ? window.localStorage.getItem(key) : null;
      if (!raw) return;
      const parsed = JSON.parse(raw) as StoredResult;
      if (parsed && typeof parsed.correct === "number" && typeof parsed.total === "number") {
        setBest(parsed);
      }
    } catch {
      // ignore parse errors
    }
  }, [slug]);

  if (!best || typeof best.correct !== "number" || typeof best.total !== "number") return null;

  const percent =
    typeof best.percent === "number"
      ? Math.round(best.percent)
      : best.total > 0
        ? Math.round((best.correct / best.total) * 100)
        : undefined;

  return (
    <p className={className}>
      Your best score: <strong>{best.correct}/{best.total}</strong>
      {typeof percent === "number" ? ` (${percent}%)` : ""}
    </p>
  );
}

