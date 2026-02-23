import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import AgeGate from '@/components/AgeGate';
import { API_ROUTES } from '@/lib/api';
import { publicMediaUrl } from '@/lib/media';
import { resolveCocktailImage } from '@/lib/cocktailImage';
import { slugify } from '@/lib/text';
import styles from '../../bar.module.css';
import BackNav from '../../BackNav';
import SaveCocktailButton from '../../SaveCocktailButton';

interface Cocktail {
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

type SimilarCocktail = {
  item: Cocktail;
  shared: string[];
  score: number;
};

type IngredientDisplay = {
  id: string | number;
  name: string;
  quantity?: string;
};

export const dynamic = 'force-dynamic';

type RouteParams = Promise<{ idSlug: string }>;

type RouteProps = {
  params: RouteParams;
};

function normalizeIngredients(cocktail: Cocktail): string[] {
  const names = [
    ...(cocktail.ingredientQuantities?.map((iq) => iq.ingridient?.name) || []),
    ...(cocktail.ingridients?.map((i) => i.name) || []),
  ];

  return Array.from(
    new Set(
      names
        .map((n) => (n || '').trim().toLowerCase())
        .filter((n) => n.length > 0),
    ),
  );
}

function formatIngredientName(name: string) {
  if (!name) return '';
  return name.charAt(0).toUpperCase() + name.slice(1);
}

function brandAlt(base: string | null | undefined, fallback: string): string {
  const core = base && base.trim().length ? base.trim() : fallback;
  return `${core} by The Nineties Times (www.90stimes.com)`;
}

async function fetchSimilarCocktails(current: Cocktail): Promise<SimilarCocktail[]> {
  const baseIngredients = normalizeIngredients(current);
  if (baseIngredients.length === 0) return [];

  try {
    const res = await fetch(API_ROUTES.COCKTAIL.GET_ALL, { next: { revalidate: 120 } });
    if (!res.ok) return [];
    const data = (await res.json()) as Cocktail[] | null;
    const candidates = Array.isArray(data) ? data : [];

    const baseSet = new Set(baseIngredients);
    const scored = candidates
      .filter((c) => c.id !== current.id)
      .map((c) => {
        const ing = normalizeIngredients(c);
        const shared = ing.filter((n) => baseSet.has(n));
        return { item: c, shared, score: shared.length };
      })
      .filter((s) => s.score > 0);

    return scored
      .sort(
        (a, b) =>
          b.score - a.score || (b.item.facts?.length ?? 0) - (a.item.facts?.length ?? 0),
      )
      .slice(0, 4);
  } catch {
    return [];
  }
}

function getMethodNote(method?: string | null): string | null {
  if (!method) return null;
  const m = method.toLowerCase();
  const isHot =
    m.includes('served hot') ||
    m.includes('serve hot') ||
    m.includes('heated') ||
    m.includes('hot');
  if (isHot) {
    return 'Serve it hot: preheat the glass with hot water, then build and garnish quickly so the drink stays warm to the last sip.';
  }
  if (m.includes('shake')) return 'Shake hard with solid ice for 10-12 seconds, then fine-strain for a silky texture.';
  if (m.includes('stir')) return 'Stir over ice until the mixing glass feels cold; aim for clarity and controlled dilution.';
  if (m.includes('build')) return 'Build directly in the glass, then give it a quick stir to pull everything together.';
  return `Keep the ${method.toLowerCase()} method tight and consistent so the drink stays in balance.`;
}

function getGlassNote(glass?: string | null): string | null {
  if (!glass) return null;
  const g = glass.toLowerCase();
  if (g.includes('martini') || g.includes('coupe'))
    return 'Chill the stemmed glass in the freezer or with ice water so the serve stays crisp.';
  if (g.includes('rocks') || g.includes('old fashioned'))
    return 'Use a cold, heavy rocks glass and clear ice if you have it to slow dilution.';
  if (g.includes('highball') || g.includes('collins'))
    return 'Pack the glass with tall, tight ice and top gently to keep bubbles lively.';
  return `Prep your ${glass} ahead of time so it is clean and ready when you pour.`;
}

function buildIngredientDisplay(cocktail: Cocktail): IngredientDisplay[] {
  if (cocktail.ingredientQuantities && cocktail.ingredientQuantities.length) {
    return cocktail.ingredientQuantities
      .map((iq) => ({
        id: iq.id,
        name: iq.ingridient?.name || '',
        quantity: iq.quantity,
      }))
      .filter((i) => i.name.trim().length > 0);
  }

  if (cocktail.ingridients && cocktail.ingridients.length) {
    return cocktail.ingridients
      .map((ing, idx) => ({
        id: ing.id ?? idx,
        name: ing.name,
        quantity: '',
      }))
      .filter((i) => i.name.trim().length > 0);
  }

  return [];
}

async function fetchCocktail(id: string): Promise<Cocktail | null> {
  try {
    const res = await fetch(API_ROUTES.COCKTAIL.GET_BY_ID(id), {
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as Cocktail;
    if (!data || !data.name) return null;
    return data;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: RouteProps): Promise<Metadata> {
  const { idSlug } = await params;
  const [idPart] = idSlug.split('-');
  const cocktail = await fetchCocktail(idPart);
  if (!cocktail) {
    return {
      title: 'Cocktail Recipe - The Nineties Bar',
      description: 'Explore cocktail recipes from The Nineties Bar.',
    };
  }
  const title = `Recipe of ${cocktail.name} | Cocktail`;
  const description =
    cocktail.content ||
    cocktail.description ||
    `Recipe of ${cocktail.name}: ingredients, glassware, and how to make it.`;
  const url = `/bar/cocktails/${idSlug}`;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      type: 'article',
    },
  };
}

export default async function CocktailDetailPage({ params }: RouteProps) {
  const { idSlug } = await params;
  const [idPart] = idSlug.split('-');
  if (!idPart) notFound();
  const cocktail = await fetchCocktail(idPart);
  if (!cocktail) notFound();

  const mainImg =
    publicMediaUrl(cocktail.stableImageUrl || cocktail.imageUrl || undefined) ||
    resolveCocktailImage({ name: cocktail.name });
  const glassImg = publicMediaUrl(
    cocktail.stableGlassImageUrl || cocktail.glassImageUrl || undefined
  );
  const facts = Array.isArray(cocktail.facts)
    ? cocktail.facts.filter((f) => typeof f === 'string' && f.trim().length > 0)
    : [];
  const heroFact = facts[0];

  const ingredientDisplay = buildIngredientDisplay(cocktail);
  const ingredientNames = normalizeIngredients(cocktail);
  const methodNote = getMethodNote(cocktail.method);
  const glassNote = getGlassNote(cocktail.glassType);
  const specPills = [
    cocktail.method ? { label: 'Method', value: cocktail.method } : null,
    cocktail.glassType ? { label: 'Glass', value: cocktail.glassType } : null,
    ingredientDisplay.length > 0
      ? { label: 'Ingredients', value: `${ingredientDisplay.length} item${ingredientDisplay.length === 1 ? '' : 's'}` }
      : null,
  ].filter(Boolean) as { label: string; value: string }[];

  const similar = await fetchSimilarCocktails(cocktail);
  const heroSupportingText =
    cocktail.content ||
    methodNote ||
    glassNote ||
    (ingredientNames.length
      ? `Built with ${ingredientNames.slice(0, 3).map(formatIngredientName).join(', ')}${
          ingredientNames.length > 3 ? ' +' + (ingredientNames.length - 3) : ''
        }.`
      : 'A bar-ready serve from The Nineties Times.');

  const content = (
    <main className={styles.page}>
      <BackNav />
      <article className={styles.cocktailDetail}>
        <section className={styles.cocktailShowcase}>
          <div className={styles.cocktailHeroMedia}>
            {mainImg ? (
              <figure className={styles.cocktailHeroFigure}>
                <div className={styles.cocktailHeroImageWrap}>
                  <img
                    src={mainImg}
                    alt={brandAlt(cocktail.imageAltText, cocktail.name)}
                    className={styles.cocktailHeroImage}
                    loading="lazy"
                  />
                  <div className={styles.cocktailHeroOverlay}>
                    {cocktail.method && (
                      <span className={styles.heroTag}>Method | {cocktail.method}</span>
                    )}
                    {cocktail.glassType && (
                      <span className={styles.heroTag}>Glass | {cocktail.glassType}</span>
                    )}
                    {ingredientDisplay.length > 0 && (
                      <span className={styles.heroTag}>
                        {ingredientDisplay.length} ingredient{ingredientDisplay.length === 1 ? '' : 's'}
                      </span>
                    )}
                  </div>
                  {glassImg && (
                    <div className={styles.glassBadge}>
                      <img
                        src={glassImg}
                        alt={brandAlt(cocktail.glassImageAltText, cocktail.glassType || 'Glass')}
                        className={styles.glassBadgeImg}
                        loading="lazy"
                      />
                      <span className={styles.glassBadgeLabel}>Serving glass</span>
                    </div>
                  )}
                </div>
                {(cocktail.imageCaption || cocktail.glassImageCaption) && (
                  <figcaption className={styles.cocktailHeroCaption}>
                    {cocktail.imageCaption || cocktail.glassImageCaption}
                  </figcaption>
                )}
              </figure>
            ) : (
              <div className={styles.cocktailHeroPlaceholder}>
                <p>No hero photo yet. Shake up a snap of {cocktail.name} to complete the menu.</p>
                {cocktail.glassType && <p>Served in a {cocktail.glassType}.</p>}
              </div>
            )}
          </div>
          <div className={styles.cocktailHeroText}>
            <p className={styles.sectionEyebrow}>The Nineties Bar</p>
            <div className={styles.cocktailTitleRow}>
              <h1 className={styles.cocktailDetailTitle}>{cocktail.name}</h1>
              <SaveCocktailButton
                cocktail={{
                  id: cocktail.id,
                  name: cocktail.name,
                  content: cocktail.content,
                  description: cocktail.description,
                  method: cocktail.method,
                  glassType: cocktail.glassType,
                  imageUrl: cocktail.imageUrl ?? null,
                  stableImageUrl: cocktail.stableImageUrl ?? null,
                }}
              />
            </div>
            {heroSupportingText && (
              <p className={styles.cocktailDetailTagline}>{heroSupportingText}</p>
            )}
            {specPills.length > 0 && (
              <div className={styles.cocktailSpecRow}>
                {specPills.map((pill) => (
                  <div key={pill.label} className={styles.cocktailSpecPill}>
                    <span className={styles.cocktailSpecLabel}>{pill.label}</span>
                    <span className={styles.cocktailSpecValue}>{pill.value}</span>
                  </div>
                ))}
              </div>
            )}
            <div className={styles.cocktailHeroNotes}>
              {heroFact && (
                <div className={styles.heroNoteCard}>
                  <p className={styles.heroNoteLabel}>House note</p>
                  <p className={styles.heroNoteText}>{heroFact}</p>
                </div>
              )}
              {ingredientNames.length > 0 && (
                <div className={styles.heroNoteCard}>
                  <p className={styles.heroNoteLabel}>Flavor map</p>
                  <p className={styles.heroNoteText}>
                    {ingredientNames.slice(0, 4).map(formatIngredientName).join(' | ')}
                    {ingredientNames.length > 4 ? ' +' + (ingredientNames.length - 4) : ''}
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>

        <section className={styles.cocktailDetailSection}>
          <h2 className={styles.sectionTitle}>Recipe of {cocktail.name}</h2>
          <p className={styles.cocktailDetailContent}>{cocktail.content}</p>
        </section>

        {ingredientDisplay.length > 0 && (
          <section className={styles.cocktailDetailSection}>
            <h2 className={styles.sectionTitle}>Ingredients</h2>
            <ul className={styles.cocktailIngredients}>
              {ingredientDisplay.map((i) => {
                const hasQty = i.quantity && i.quantity.trim().length > 0;
                return (
                  <li key={i.id}>
                    {hasQty && <span>{i.quantity}</span>} {hasQty && ' '}
                    <strong>{i.name}</strong>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {cocktail.description && cocktail.description.trim().length > 0 && (
          <section className={styles.cocktailDetailSection}>
            <h2 className={styles.sectionTitle}>How to make it</h2>
            <p className={styles.cocktailDetailContent}>{cocktail.description}</p>
          </section>
        )}

        {facts.length > 0 && (
          <section className={styles.cocktailDetailSection}>
            <h2 className={styles.sectionTitle}>Facts & Notes</h2>
            <ul className={styles.cocktailFacts}>
              {facts.map((f, idx) => (
                <li key={idx}>{f}</li>
              ))}
            </ul>
          </section>
        )}

        {(methodNote || glassNote) && (
          <section className={styles.cocktailDetailSection}>
            <h2 className={styles.sectionTitle}>Bartender notes</h2>
            <div className={styles.tipCard}>
              <p className={styles.tipHeadline}>Serve like a pro</p>
              {methodNote && <p>{methodNote}</p>}
              {glassNote && <p>{glassNote}</p>}
              {ingredientNames.length > 0 && (
                <p>
                  Mise en place: {ingredientNames.length} staple
                  {ingredientNames.length === 1 ? '' : 's'} including{' '}
                  {ingredientNames.slice(0, 3).map(formatIngredientName).join(', ')}
                  {ingredientNames.length > 3 ? '...' : '.'}
                </p>
              )}
            </div>
          </section>
        )}

        {similar.length > 0 && (
          <section className={styles.cocktailDetailSection}>
            <h2 className={styles.sectionTitle}>Similar cocktails</h2>
            <p className={styles.sectionHint}>
              These share a few of the same ingredients and vibe. Swap in one if the bar is stocked for it.
            </p>
            <div className={styles.similarGrid}>
              {similar.map((entry) => {
                const c = entry.item;
                const href = `/bar/cocktails/${c.id}-${slugify(c.name || '')}`;
                const img = resolveCocktailImage(c);
                const sharedDisplay =
                  entry.shared.length > 0
                    ? entry.shared.slice(0, 4).map(formatIngredientName)
                    : [];
                return (
                  <Link key={c.id} href={href} className={styles.similarCard}>
                    <div>
                      {img ? (
                        <img src={img} alt={c.name} className={styles.similarThumb} loading="lazy" />
                      ) : (
                        <div className={styles.similarThumb} aria-hidden />
                      )}
                    </div>
                    <div className={styles.similarBody}>
                      <p className={styles.similarTitle}>{c.name}</p>
                      <p className={styles.similarMeta}>
                        {[c.method, c.glassType].filter(Boolean).join(' / ') || 'House cocktail'}
                      </p>
                      {sharedDisplay.length > 0 && (
                        <div className={styles.similarShared}>
                          {sharedDisplay.map((s) => (
                            <span key={s} className={styles.sharedChip}>
                              {s}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}
      </article>
    </main>
  );

  return <AgeGate storageKey="barVerified">{content}</AgeGate>;
}


