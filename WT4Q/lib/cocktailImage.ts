import { publicMediaUrl } from "@/lib/media";

export type CocktailImageLike = {
  name?: string | null;
  stableImageUrl?: string | null;
  imageUrl?: string | null;
  stableGlassImageUrl?: string | null;
  glassImageUrl?: string | null;
};

export function resolveCocktailImage(input: CocktailImageLike): string | undefined {
  const direct = publicMediaUrl(
    input.stableImageUrl ||
      input.imageUrl ||
      input.stableGlassImageUrl ||
      input.glassImageUrl ||
      undefined,
  );
  if (direct) return direct;

  const name = input.name?.trim();
  if (name) {
    return `/api/cocktail-image?name=${encodeURIComponent(name)}`;
  }

  // Always return a resolvable fallback image URL.
  return "/api/cocktail-image";
}
