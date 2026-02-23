import { Metadata } from 'next';
import Link from 'next/link';
import { VT323 } from 'next/font/google';
import { API_ROUTES } from '@/lib/api';
import { publicMediaUrl } from '@/lib/media';
import RetroBackLink from '@/components/RetroBackLink';
import ShowTriviaCarousel from '@/components/ShowTriviaCarousel';
import type { Show } from '@/lib/shows.types';
import styles from './retro.module.css';
import BornShowHeroImage from '@/components/BornShowHeroImage';
import { VAULT_BASE } from '@/lib/vaultPaths';

const retro = VT323({ weight: '400', subsets: ['latin'], variable: '--retro-font' });

export async function generateShowMetadata(slug: string): Promise<Metadata> {
  try {
    const res = await fetch(API_ROUTES.SHOW.GET(slug), { next: { revalidate: 120 } });
    if (!res.ok) return {};
    const show = (await res.json()) as Show;
    const title = `${show.title} (${show.kind}) - 90s Exclusive | The Nineties Times`;
    const description = show.description || 'Explore quizzes and trivias from the 90s.';
    const image = publicMediaUrl(show.stableImageUrl || show.imageUrl);
    return { title, description, openGraph: { title, description, images: image ? [image] : undefined } };
  } catch {
    return {};
  }
}

export async function renderShowPage(slug: string) {
  const res = await fetch(API_ROUTES.SHOW.GET(slug), { next: { revalidate: 120 } });
  if (!res.ok) return null;
  const show = (await res.json()) as Show;
  const heroImage = publicMediaUrl(show.stableImageUrl || show.imageUrl);
  const years = show.yearStart ? `${show.yearStart}${show.yearEnd ? `-${show.yearEnd}` : ''}` : '1990s';

  return (
    <div className={`${retro.variable} ${styles.retroTheme} ${styles.page}`}>
      <div className={styles.noise} aria-hidden="true" />

      <section className={styles.showHero}>
        <div className={styles.heroBackWrap}>
          <RetroBackLink label="Back to vault" href={VAULT_BASE} variant="ghost" />
          <Link href={VAULT_BASE} className={styles.heroHomeLink} aria-label="90s Exclusive home">
            <svg
              className={styles.heroHomeIcon}
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                fill="currentColor"
                d="M12 3.172 3.172 12 5 13.828V21h6v-4h2v4h6v-7.172L20.828 12 12 3.172Z"
              />
            </svg>
          </Link>
        </div>
        <div className={styles.heroContent}>
          <span className={styles.heroBadge}>{show.kind || 'Retro Classic'}</span>
          <h1 className={styles.heroTitle}>{show.title}</h1>
          <p className={styles.heroSubtitle}>{show.description || `${show.kind} from the 90s.`}</p>
        </div>
        <div className={styles.heroStats}>
          <div className={styles.statCard}>
            <span className={styles.statLabel}>Era</span>
            <span className={styles.statValue}>{years}</span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statLabel}>Filed quizzes</span>
            <span className={styles.statValue}>{show.quizzes?.length ?? 0}</span>
            <span className={styles.statMeta}>Linked challenges from the vault</span>
          </div>
        </div>
      </section>

      {heroImage && (
        <div className={styles.heroImageFrame}>
          <BornShowHeroImage
            src={heroImage}
            alt={show.imageAltText || `${show.title} 90s show artwork on The Nineties Times (90sTimes)`}
            className={styles.heroImage}
          />
          {show.imageCaption && (
            <div className={styles.heroImageCaption}>
              {show.imageCaption}
            </div>
          )}
        </div>
      )}

      {show.trivias && show.trivias.length > 0 && (
        <ShowTriviaCarousel showTitle={show.title} trivias={show.trivias} />
      )}

      <section className={styles.infoGrid}>
        <article className={styles.detailCard}>
          <div className={styles.cardHeader}>
            <span className={styles.badge}>About the show</span>
            <h3 className={styles.cardTitle}>{show.title}</h3>
          </div>
          <p className={styles.cardBody}>
            {show.description ||
              'Relive the friendships, rivalries, and crowd-cheering cliffhangers that made this a 90s favorite.'}
          </p>
          <div className={styles.miniMeta}>
            <span>Kind: {show.kind || 'Retro'}</span>
            {show.tags && show.tags.length > 0 && <span>Tags: {show.tags.slice(0, 3).join(', ')}</span>}
          </div>
        </article>
      </section>

      <div className={styles.listDivider} />

      <section className={styles.section}>
        <div className={styles.sectionHeading}>Quizzes & Games</div>
        <p className={styles.sectionSubhead}>
          Hand-crafted challenges linked to this show. Grab your bestie and prove you know every line by heart.
        </p>
        <div className={styles.grid}>
          {(show.quizzes || []).map((q) => (
            <article key={q.slug} className={`${styles.card} ${styles.quizCard}`}>
              <div className={styles.cardHeader}>
                <span className={styles.quizType}>{q.type.toUpperCase()}</span>
                <h3 className={styles.cardTitle}>{q.title}</h3>
                <p className={styles.cardMeta}>
                  {q.createdAt ? new Date(q.createdAt).toLocaleDateString() : 'Fresh upload'}
                </p>
              </div>
              {q.description && <p className={styles.cardBody}>{q.description}</p>}
              <div className={styles.cardFooter}>
                <Link href={`${VAULT_BASE}/${q.slug}`} className={styles.ctaPrimary}>
                  Play
                </Link>
              </div>
            </article>
          ))}
          {(!show.quizzes || show.quizzes.length === 0) && (
            <article className={`${styles.card} ${styles.emptyCard}`}>
              <h3 className={styles.cardTitle}>No quizzes yet</h3>
              <p>Check back soon for new games about {show.title}.</p>
            </article>
          )}
        </div>
      </section>
    </div>
  );
}

