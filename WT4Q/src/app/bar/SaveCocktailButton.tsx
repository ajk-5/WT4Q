'use client';

import { useSavedCocktails } from '@/hooks/useSavedCocktails';
import styles from './bar.module.css';

interface SaveCocktailButtonProps {
  cocktail: {
    id: number;
    name: string;
    content?: string | null;
    description?: string | null;
    method?: string | null;
    glassType?: string | null;
    imageUrl?: string | null;
    stableImageUrl?: string | null;
  };
}

export default function SaveCocktailButton({ cocktail }: SaveCocktailButtonProps) {
  const { saved, toggle } = useSavedCocktails();
  const isSaved = saved.some((c) => c.id === cocktail.id);

  const handleClick = () => {
    toggle({
      id: cocktail.id,
      name: cocktail.name,
      content: cocktail.content,
      description: cocktail.description,
      method: cocktail.method,
      glassType: cocktail.glassType,
      imageUrl: cocktail.stableImageUrl || cocktail.imageUrl || null,
    });
  };

  return (
    <button
      type="button"
      className={`${styles.saveCocktailButton} ${
        isSaved ? styles.saveCocktailButtonActive : ''
      }`}
      onClick={handleClick}
      aria-pressed={isSaved}
      aria-label={isSaved ? 'Remove from saved cocktails' : 'Save this cocktail'}
    >
      <svg
        className={styles.saveCocktailIcon}
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          d="M6 3h12a1 1 0 0 1 1 1v17l-7-4-7 4V4a1 1 0 0 1 1-1z"
          fill={isSaved ? 'currentColor' : 'none'}
          stroke="currentColor"
          strokeWidth="1.5"
        />
      </svg>
    </button>
  );
}

