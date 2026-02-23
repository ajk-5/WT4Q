'use client';

import { useCallback, useEffect, useState } from 'react';

export interface SavedCocktail {
  id: number;
  name: string;
  content?: string | null;
  description?: string | null;
  method?: string | null;
  glassType?: string | null;
  imageUrl?: string | null;
}

const STORAGE_KEY = 'bar.savedCocktails.v1';

export function useSavedCocktails() {
  const [saved, setSaved] = useState<SavedCocktail[]>([]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        setSaved(parsed);
      }
    } catch {
      // ignore malformed local storage
    }
  }, []);

  const toggle = useCallback((cocktail: SavedCocktail) => {
    setSaved((prev) => {
      const exists = prev.some((c) => c.id === cocktail.id);
      const next = exists
        ? prev.filter((c) => c.id !== cocktail.id)
        : [...prev, cocktail];
      try {
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        }
      } catch {
        // ignore quota / storage errors
      }
      return next;
    });
  }, []);

  const isSaved = useCallback(
    (id: number) => saved.some((c) => c.id === id),
    [saved],
  );

  const remove = useCallback((id: number) => {
    setSaved((prev) => {
      const next = prev.filter((c) => c.id !== id);
      try {
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        }
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  const clear = useCallback(() => {
    setSaved([]);
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      // ignore
    }
  }, []);

  return { saved, isSaved, toggle, remove, clear };
}

