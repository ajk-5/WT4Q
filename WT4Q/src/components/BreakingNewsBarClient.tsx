"use client";

import dynamic from "next/dynamic";

const BreakingNewsBar = dynamic(() => import("@/components/BreakingNewsBar"), {
  ssr: false,
  loading: () => (
    <div data-component="breaking-bar" style={{ minHeight: "3.5rem" }} aria-hidden="true" />
  ),
});

export default function BreakingNewsBarClient() {
  return <BreakingNewsBar />;
}

