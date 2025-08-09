import { Metadata } from "next";
import type { JSX } from "react";
import MemeMakerClient from "./components/MemeMakerClient";

export const metadata: Metadata = {
  title: "Meme Maker",
  description: "Create custom memes with text, images, or video overlays.",
  keywords: ["meme", "meme maker", "image editor", "tools"],
};

export default function MemeMakerPage(): JSX.Element {
  return <MemeMakerClient />;
}
