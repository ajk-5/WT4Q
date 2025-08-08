import { Metadata } from "next";
import MemeMaker from "@/components/services/MemeMaker";
import type { JSX } from "react";

export const metadata: Metadata = {
  title: "Meme Maker",
  description: "Create custom memes with text, images, or video overlays.",
  keywords: ["meme", "meme maker", "image editor", "tools"],
};

export default function MemeMakerPage(): JSX.Element {
  return <MemeMaker />;
}
