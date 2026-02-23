import { NextResponse } from "next/server";

type CocktailDbResponse = {
  drinks?: Array<{ strDrinkThumb?: string | null }> | null;
};

const FALLBACK_PATH = "/images/cocktail-placeholder.svg";
const SEARCH_URL = "https://www.thecocktaildb.com/api/json/v1/1/search.php?s=";
const TTL_MS = 24 * 60 * 60 * 1000;

export async function GET(req: Request) {
  const requestUrl = new URL(req.url);
  const name = requestUrl.searchParams.get("name")?.trim();

  if (!name) {
    return redirectWithCache(new URL(FALLBACK_PATH, requestUrl).toString());
  }

  try {
    const res = await fetch(`${SEARCH_URL}${encodeURIComponent(name)}`, {
      next: { revalidate: Math.floor(TTL_MS / 1000) },
    });

    if (res.ok) {
      const json = (await res.json()) as CocktailDbResponse;
      const thumb = json.drinks?.[0]?.strDrinkThumb?.trim();
      if (thumb) {
        return redirectWithCache(thumb);
      }
    }
  } catch {
    // Fall through to local fallback image.
  }

  return redirectWithCache(new URL(FALLBACK_PATH, requestUrl).toString());
}

function redirectWithCache(target: string) {
  const ttl = Math.max(1, Math.floor(TTL_MS / 1000));
  return NextResponse.redirect(target, {
    headers: {
      "Cache-Control": `public, max-age=${ttl}, s-maxage=${ttl}, stale-while-revalidate=${ttl * 3}`,
    },
  });
}

