import { Metadata } from "next";
import dynamic from "next/dynamic";
import type { JSX } from "react";

const MemeMaker = dynamic(
  () => import("@/components/services/MemeMaker"),
  { ssr: false }
);

export const metadata: Metadata = {
  title: "Meme Maker",
  description: "Create custom memes with text, images, or video overlays.",
  keywords: ["meme", "meme maker", "image editor", "tools"],
};

export default function MemeMakerPage(): JSX.Element {
  return <MemeMaker />;
}
