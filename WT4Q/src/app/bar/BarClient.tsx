"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { API_ROUTES } from "@/lib/api";
import { slugify } from "@/lib/text";
import { publicMediaUrl } from "@/lib/media";
import { resolveCocktailImage } from "@/lib/cocktailImage";
import styles from "./bar.module.css";

export interface Cocktail {
  id: number;
  name: string;
  content: string;
  description?: string | null;
  method?: string | null;
  glassType?: string | null;
  imageUrl?: string | null;
  glassImageUrl?: string | null;
  stableImageUrl?: string | null;
  stableGlassImageUrl?: string | null;
  imageAltText?: string | null;
  imageCaption?: string | null;
  glassImageAltText?: string | null;
  glassImageCaption?: string | null;
  facts?: string[] | null;
  ingridients?: { id: number; name: string }[] | null;
  ingredientQuantities?: {
    id: number;
    quantity: string;
    ingridient?: { id: number; name: string } | null;
  }[] | null;
}

interface BarClientProps {
  initialCocktails: Cocktail[];
}

export default function BarClient({ initialCocktails }: BarClientProps) {
  const [query, setQuery] = useState("");
  const [cocktails, setCocktails] = useState<Cocktail[]>(initialCocktails || []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasUserSearched, setHasUserSearched] = useState(false);
  const [tokens, setTokens] = useState<string[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [suggesting, setSuggesting] = useState(false);
  const [visibleCount, setVisibleCount] = useState(10);

  useEffect(() => {
    setCocktails(initialCocktails || []);
  }, [initialCocktails]);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setSuggestions([]);
      return;
    }

    const handle = window.setTimeout(async () => {
      setSuggesting(true);
      try {
        const res = await fetch(API_ROUTES.COCKTAIL.SUGGEST_INGREDIENTS(trimmed), { cache: "no-store" });
        if (!res.ok) {
          setSuggestions([]);
          return;
        }
        const data = (await res.json()) as string[] | null;
        setSuggestions(Array.isArray(data) ? data : []);
      } catch {
        setSuggestions([]);
      } finally {
        setSuggesting(false);
      }
    }, 200);

    return () => window.clearTimeout(handle);
  }, [query]);

  useEffect(() => {
    let cancelled = false;
    async function refreshLatest() {
      try {
        const res = await fetch(API_ROUTES.COCKTAIL.GET_ALL, { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as Cocktail[] | null;
        if (!cancelled && !hasUserSearched) {
          setCocktails(Array.isArray(data) ? data : []);
        }
      } catch {
        /* keep existing list if refresh fails */
      }
    }
    void refreshLatest();
    return () => {
      cancelled = true;
    };
  }, [hasUserSearched]);

  const normalizeToken = (value: string) => value.trim();

  const performSearchFromParts = async (parts: string[]) => {
    const searchString = parts.join(" ").trim();
    if (searchString.length > 0 && searchString.length < 2) {
      setError("Type at least 2 letters to search cocktails.");
      return;
    }
    setHasUserSearched(true);
    setError(null);
    setLoading(true);
    try {
      const url = searchString
        ? API_ROUTES.COCKTAIL.SEARCH(searchString)
        : API_ROUTES.COCKTAIL.GET_ALL;
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) {
        setCocktails([]);
        const msg = await res.text().catch(() => "");
        if (msg) setError(msg);
        return;
      }
      const data = (await res.json()) as Cocktail[] | null;
      setCocktails(Array.isArray(data) ? data : []);
      setVisibleCount(10);
    } catch {
      setError("Unable to load cocktails right now.");
      setCocktails([]);
    } finally {
      setLoading(false);
    }
  };

  const addToken = (value: string) => {
    const clean = normalizeToken(value);
    if (!clean) return;
    if (clean.length < 2) {
      setError("Type at least 2 letters to add a search token.");
      return;
    }
    const exists = tokens.some((t) => t.toLowerCase() === clean.toLowerCase());
    const nextTokens = exists ? tokens : [...tokens, clean];
    setTokens(nextTokens);
    setQuery("");
    void performSearchFromParts(nextTokens);
  };

  const removeToken = (value: string) => {
    const nextTokens = tokens.filter((t) => t !== value);
    setTokens(nextTokens);
    const trimmed = query.trim();
    const parts = trimmed ? [...nextTokens, trimmed] : nextTokens;
    void performSearchFromParts(parts);
  };

  async function handleSearch(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmed = query.trim();
    if (trimmed && trimmed.length >= 2) {
      addToken(trimmed);
    } else if (trimmed && trimmed.length < 2) {
      setError("Type at least 2 letters to search cocktails.");
    } else {
      void performSearchFromParts(tokens);
    }
  }

  useEffect(() => {
    setVisibleCount(10);
  }, [cocktails]);

  const loadMore = useCallback(() => {
    setVisibleCount((prev) => Math.min(prev + 10, cocktails.length));
  }, [cocktails.length]);

  const observerRef = useMemo(() => {
    if (typeof IntersectionObserver === "undefined") return null;
    return new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          loadMore();
        }
      },
      { rootMargin: "120px 0px", threshold: 0.1 }
    );
  }, [loadMore]);

  useEffect(() => {
    return () => {
      observerRef?.disconnect();
    };
  }, [observerRef]);

  const setSentinelRef = (node: HTMLDivElement | null) => {
    if (!observerRef) return;
    observerRef.disconnect();
    if (node) observerRef.observe(node);
  };

  const slicedCocktails = useMemo(
    () => cocktails.slice(0, Math.min(visibleCount, cocktails.length)),
    [cocktails, visibleCount]
  );

  const suggestedCocktail = useMemo(() => {
    if (cocktails.length === 0) return null;
    return cocktails[Math.floor(Math.random() * cocktails.length)];
  }, [cocktails]);

  const ingredientNames = (c: Cocktail): string[] => {
    const names = [
      ...(c.ingredientQuantities?.map((iq) => iq.ingridient?.name || "") ?? []),
      ...(c.ingridients?.map((ing) => ing.name || "") ?? []),
    ]
      .map((n) => n.trim())
      .filter(Boolean);
    return Array.from(new Set(names.map((n) => n.toLowerCase()))).map(
      (n) => n.charAt(0).toUpperCase() + n.slice(1)
    );
  };

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div>
          <h1 className={styles.title}>The Nineties Bar</h1>
          <p className={styles.subtitle}>
            Curated cocktails, party games, and a dash of nostalgia for your next night in.
          </p>
          <div className={styles.heroActions}>
            <Link href="/bar/wheel-of-fortune" className={styles.heroWheelLink}>
              Open Wheel of Cocktails
            </Link>
            <Link href="/bar/games" className={styles.heroWheelLink}>
              Open Bar Games
            </Link>
            <Link href="/bar/saved" className={styles.heroWheelLink}>
              Saved Cocktails
            </Link>
          </div>
        </div>
      </section>

      <section className={styles.searchSection}>
        <form onSubmit={handleSearch} className={styles.form}>
          {tokens.length > 0 && (
            <div className={styles.tokenRow}>
              {tokens.map((token) => (
                <span key={token} className={styles.tokenChip}>
                  {token}
                  <button
                    type="button"
                    className={styles.tokenRemove}
                    onClick={() => removeToken(token)}
                    aria-label={`Remove ${token}`}
                  >
                    x
                  </button>
                </span>
              ))}
            </div>
          )}
          <input
            type="text"
            placeholder="Search cocktails by name, description, or ingredients (e.g. vodka, lime)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className={styles.input}
            aria-label="Search cocktails by name or ingredient"
          />
          <button type="submit" className={styles.searchButton} disabled={loading}>
            {loading ? "Searching..." : "Search"}
          </button>
        </form>
        {(suggestions.length > 0 || suggesting) && (
          <div className={styles.suggestionPanel}>
            {suggesting && <div className={styles.suggestionHint}>Suggesting...</div>}
            <div className={styles.suggestionHint}>Tap to add ingredients to your search</div>
            <div className={styles.suggestionPills}>
              {suggestions.map((s) => (
                <button
                  key={s}
                  type="button"
                  className={styles.suggestionPill}
                  onClick={() => {
                    addToken(s);
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {error && <p className={styles.error}>{error}</p>}
      </section>

      <section className={styles.mainLayout}>
        <div className={styles.cocktailColumn}>
          <header className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>House Cocktails</h2>
            <p className={styles.sectionHint}>
              Tap a recipe card to view the full serve, ingredients, and notes.
            </p>
          </header>
          {cocktails.length === 0 ? (
            <p className={styles.emptyState}>
              No cocktails found. Try a broader search or add new recipes in the admin.
            </p>
          ) : (
            <div className={styles.cocktailGrid}>
              {slicedCocktails.map((c) => {
                const slug = slugify(c.name || "");
                const href = `/bar/cocktails/${c.id}-${slug}`;
                const cocktailImage =
                  publicMediaUrl(c.stableImageUrl || c.imageUrl || undefined) ||
                  resolveCocktailImage({ name: c.name });
                const glassImage = publicMediaUrl(
                  c.stableGlassImageUrl || c.glassImageUrl || undefined
                );
                const summary =
                  c.description && c.description.trim().length > 0
                    ? c.description
                    : c.content && c.content.length > 120
                    ? `${c.content.slice(0, 120)}...`
                    : c.content;
                const ingNames = ingredientNames(c);
                const metaDisplay =
                  ingNames.length > 0 ? ingNames.slice(0, 4) : [];
                return (
                  <Link key={c.id} href={href} className={styles.cocktailCard}>
                    {cocktailImage || glassImage ? (
                      <div className={styles.cocktailImageWrap}>
                        {glassImage && (
                          <img
                            src={glassImage}
                            alt={`${c.name} glass`}
                            className={styles.cocktailGlassImage}
                            loading="lazy"
                          />
                        )}
                        {cocktailImage && (
                          <img
                            src={cocktailImage}
                            alt={c.name}
                            className={styles.cocktailMainImage}
                            loading="lazy"
                          />
                        )}
                      </div>
                    ) : (
                      <div className={styles.cocktailPlaceholder}>
                        <span className={styles.cocktailPlaceholderText}>No image yet</span>
                      </div>
                    )}
                    <div className={styles.cocktailBody}>
                      <h3 className={styles.cocktailName}>{c.name}</h3>
                      <p className={styles.cocktailExcerpt}>{summary}</p>
                      {metaDisplay.length > 0 && (
                        <div className={styles.cocktailMetaRow}>
                          {metaDisplay.map((m) => (
                            <span key={m} className={styles.sharedChip}>
                              {m}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </Link>
                );
              })}
              {slicedCocktails.length < cocktails.length && (
                <div ref={setSentinelRef} className={styles.loadMoreSentinel} aria-hidden="true" />
              )}
            </div>
          )}
        </div>

        <aside className={styles.sidebar}>
          <section className={styles.suggestedSection}>
            <h2 className={styles.sectionTitle}>Suggested Cocktail</h2>
            <p className={styles.sectionHint}>
              A quick pick from the menu. Refresh with a search or spin the wheel for more.
            </p>
            {suggestedCocktail ? (
              <Link
                href={`/bar/cocktails/${suggestedCocktail.id}-${slugify(suggestedCocktail.name || "")}`}
                className={styles.suggestedCard}
              >
                {(() => {
                  const img = resolveCocktailImage(suggestedCocktail);
                  return (
                <div className={styles.suggestedMedia}>
                    {img ? (
                      <img src={img} alt={suggestedCocktail.name} loading="lazy" />
                    ) : (
                      <div className={styles.cocktailPlaceholder}>
                        <span className={styles.cocktailPlaceholderText}>No image yet</span>
                      </div>
                    )}
                  </div>
                  );
                })()}
                <div className={styles.suggestedBody}>
                  <h3 className={styles.suggestedTitle}>{suggestedCocktail.name}</h3>
                  <p className={styles.suggestedExcerpt}>
                    {suggestedCocktail.description || suggestedCocktail.content?.slice(0, 110) || "Signature serve"}
                  </p>
                  {ingredientNames(suggestedCocktail).slice(0, 4).length > 0 && (
                    <div className={styles.cocktailMetaRow}>
                      {ingredientNames(suggestedCocktail)
                        .slice(0, 4)
                        .map((ing) => (
                          <span key={ing} className={styles.sharedChip}>
                            {ing}
                          </span>
                        ))}
                    </div>
                  )}
                </div>
              </Link>
            ) : (
              <p className={styles.emptyState}>No suggestion yet - add cocktails first.</p>
            )}
          </section>
        </aside>
      </section>
    </div>
  );
}


