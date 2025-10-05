"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

const BreakingNewsBar = dynamic(() => import("@/components/BreakingNewsBar"), {
  ssr: false,
});

export default function BreakingNewsBarClient() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Defer mounting to idle time to reduce main-thread contention
    const start = () => setReady(true);
    if (typeof window === "undefined") return;

    const w = window as unknown as {
      requestIdleCallback?: (cb: () => void) => number;
      setTimeout: typeof setTimeout;
      clearTimeout: typeof clearTimeout;
    };

    if (typeof w.requestIdleCallback === "function") {
      w.requestIdleCallback(start);
      return;
    }

    const t = w.setTimeout(start, 1500);
    return () => w.clearTimeout(t);
  }, []);

  if (!ready) {
    return <div data-component="breaking-bar" style={{ minHeight: "3.5rem" }} aria-hidden="true" />;
  }

  return <BreakingNewsBar />;
}
