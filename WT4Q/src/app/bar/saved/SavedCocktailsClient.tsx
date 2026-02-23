'use client';

import Link from 'next/link';
import { slugify } from '@/lib/text';
import { resolveCocktailImage } from '@/lib/cocktailImage';
import { useSavedCocktails } from '@/hooks/useSavedCocktails';
import styles from '../bar.module.css';

export default function SavedCocktailsClient() {
  const { saved, remove, clear } = useSavedCocktails();

  const hasAny = saved.length > 0;

  return (
    <div>
      <section className={styles.hero}>
        <div>
          <h1 className={styles.title}>Saved Cocktails</h1>
          <p className={styles.subtitle}>
            Your bookmarked recipes, stored only on this device. Tap a card to open the full serve.
          </p>
        </div>
      </section>

      {!hasAny ? (
        <p className={styles.emptyState}>
          You haven&apos;t saved any cocktails yet. Browse the bar and tap the bookmark
          icon on a recipe to keep it here.
        </p>
      ) : (
        <>
          <div
            className={styles.sectionHeader}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '0.75rem',
            }}
          >
            <div>
              <h2 className={styles.sectionTitle}>Your list</h2>
              <p className={styles.sectionHint}>
                {saved.length} cocktail{saved.length === 1 ? '' : 's'} saved on this
                browser.
              </p>
            </div>
            <button
              type="button"
              className={styles.clearWheelButton}
              onClick={clear}
            >
              Clear all
            </button>
          </div>

          <div className={styles.cocktailGrid}>
            {saved.map((c) => {
              const href = `/bar/cocktails/${c.id}-${slugify(c.name || '')}`;
              const img = resolveCocktailImage(c);
              const summary =
                (c.content && c.content.length > 120
                  ? `${c.content.slice(0, 120)}...`
                  : c.content) ||
                c.description ||
                '';
              return (
                <div key={c.id} className={styles.cocktailCard}>
                  {img ? (
                    <div className={styles.cocktailImageWrap}>
                      <img
                        src={img}
                        alt={c.name}
                        className={styles.cocktailMainImage}
                        loading="lazy"
                      />
                    </div>
                  ) : (
                    <div className={styles.cocktailPlaceholder}>
                      <span className={styles.cocktailPlaceholderText}>
                        No image yet
                      </span>
                    </div>
                  )}
                  <div className={styles.cocktailBody}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '0.5rem',
                      }}
                    >
                      <h3 className={styles.cocktailName}>{c.name}</h3>
                      <button
                        type="button"
                        className={styles.selectedRemoveButton}
                        onClick={() => remove(c.id)}
                      >
                        Remove
                      </button>
                    </div>
                    {summary && (
                      <p className={styles.cocktailExcerpt}>{summary}</p>
                    )}
                    <Link href={href} className={styles.wheelResultLink}>
                      Open recipe
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
