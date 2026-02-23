import type { Metadata } from 'next';
import type { Article } from '@/components/ArticleCard';
import BreakingCenterpiece from '@/components/BreakingCenterpiece';
import TrendingCenterpiece from '@/components/TrendingCenterpiece';
import PrefetchLink from '@/components/PrefetchLink';
import type { ArticleImage } from '@/lib/models';
import { API_ROUTES } from '@/lib/api';
import { CATEGORY_DEFINITIONS } from '@/lib/categories';
import { getArticlesByCategory } from '@/lib/server/articles';
import styles from './page.module.css';
import { VAULT_BASE } from '@/lib/vaultPaths';

export const revalidate = 180;

export const metadata: Metadata = {
  title: 'The Nineties Times: 90s Stories, Quizzes, and Time Capsule',
  description:
    'The Nineties Times is a 90s nostalgia hub with stories, quizzes, arcade throwbacks, and pop culture memories.',
  keywords: [
    'The Nineties Times',
    '90sTimes',
    '90s nostalgia',
    '90s time capsule',
    'retro games',
    '90s quizzes',
  ],
  alternates: { canonical: '/' },
  openGraph: {
    title: 'The Nineties Times - 90s nostalgia hub',
    description:
      'Stories, quizzes, arcade throwbacks, and pop culture memories from the 90s.',
    url: '/',
    type: 'website',
  },
};

export default async function Home() {
  const [infoArticles, trendingArticles] = await Promise.all([
    fetchArticlesByCategory('Info'),
    fetchTrending(),
  ]);

  const spotlightSource = infoArticles.length > 0 ? infoArticles : trendingArticles;

  const spotlightArticles = spotlightSource.slice(0, 8).map((a) => ({
    id: a.id,
    slug: a.slug,
    title: a.title,
    content: a.content,
    images: a.images as ArticleImage[],
    createdDate: a.createdDate,
  }));

  const issue = new Date().toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className={styles.landing}>
      <section className={styles.topGrid}>
        <div className={styles.coverWindow}>
          <div className={styles.titleBar}>
            <div className={styles.titleLeft}>
              <span className={styles.titleText}>Dial-Up Desktop</span>
              <span className={styles.titleMeta}>Issue {issue}</span>
            </div>
            <div className={styles.titleButtons} aria-hidden="true">
              <span className={styles.titlePip} />
              <span className={styles.titlePip} />
              <span className={`${styles.titlePip} ${styles.titlePipClose}`} />
            </div>
          </div>

          <div className={styles.windowBody}>
            <span className={styles.coverKicker}>90s hangout destination</span>
            <h1 className={styles.coverTitle}>The Nineties Times</h1>
            <p className={styles.coverSubtitle}>
              A cozy corner for mixtapes, mall culture, dial-up nostalgia, and freshly generated 90s throwbacks.
            </p>

            <div className={styles.actionRow}>
              <PrefetchLink href={VAULT_BASE} className={styles.primaryCta}>
                90s Exclusive
              </PrefetchLink>
              <PrefetchLink href="/arcade" className={styles.secondaryCta}>
                Arcade
              </PrefetchLink>
              <PrefetchLink href={`${VAULT_BASE}#quizzes`} className={styles.secondaryCta}>
                Quizzes
              </PrefetchLink>
              <PrefetchLink href="/forum" className={styles.secondaryCta}>
                Forum
              </PrefetchLink>
            </div>

            <div className={styles.quickGrid} aria-label="Daily drops">
              <PrefetchLink href="/on-this-day-in-the-90s" className={styles.quickLink}>
                <span className={styles.quickTitle}>On This Day</span>
                <span className={styles.quickDesc}>Twice daily timeline</span>
              </PrefetchLink>
              <PrefetchLink href="/category#blast-from-the-past" className={styles.quickLink}>
                <span className={styles.quickTitle}>Blast From Past</span>
                <span className={styles.quickDesc}>Twice daily throwback</span>
              </PrefetchLink>
              <PrefetchLink href="/jokes" className={styles.quickLink}>
                <span className={styles.quickTitle}>Jokes</span>
                <span className={styles.quickDesc}>Hourly one-liners</span>
              </PrefetchLink>
              <PrefetchLink href="/bar" className={styles.quickLink}>
                <span className={styles.quickTitle}>Bar</span>
                <span className={styles.quickDesc}>Party mini-games</span>
              </PrefetchLink>
            </div>
          </div>
        </div>

        <div className={styles.spotlight}>
          <BreakingCenterpiece articles={spotlightArticles} label="Cover Story" />
        </div>
      </section>

      <section className={styles.featureRow}>
        <div className={styles.sectionHeader}>
          <h2>Most Loved Right Now</h2>
          <PrefetchLink href="/trending" className={styles.sectionAction}>
            View all
          </PrefetchLink>
        </div>
        <TrendingCenterpiece articles={trendingArticles} />
      </section>

      <section className={styles.channels}>
        <div className={styles.sectionHeader}>
          <h2>Time Capsule Channels</h2>
          <PrefetchLink href="/category" className={styles.sectionAction}>
            Browse categories
          </PrefetchLink>
        </div>
        <div className={styles.channelGrid}>
          {CATEGORY_DEFINITIONS.map((c) => (
            <article key={c.key} className={styles.channelCard}>
              <span className={styles.channelTag}>Channel</span>
              <h3 className={styles.channelTitle}>{c.label}</h3>
              <p className={styles.channelDesc}>{c.description}</p>
              <PrefetchLink
                href={`/category/${encodeURIComponent(c.key)}`}
                className={styles.exploreButton}
              >
                Explore
              </PrefetchLink>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.hangout}>
        <div className={styles.sectionHeader}>
          <h2>Hangout Shortcuts</h2>
          <PrefetchLink href="/about" className={styles.sectionAction}>
            About
          </PrefetchLink>
        </div>
        <div className={styles.hangoutGrid}>
          <PrefetchLink href={VAULT_BASE} className={styles.hangoutCard}>
            <span className={styles.hangoutTitle}>90s Exclusive</span>
            <span className={styles.hangoutCopy}>Vault quizzes, trivia, and deep cuts.</span>
          </PrefetchLink>
          <PrefetchLink href="/arcade" className={styles.hangoutCard}>
            <span className={styles.hangoutTitle}>Arcade</span>
            <span className={styles.hangoutCopy}>Click-to-play retro web games.</span>
          </PrefetchLink>
          <PrefetchLink href="/jokes" className={styles.hangoutCard}>
            <span className={styles.hangoutTitle}>Jokes</span>
            <span className={styles.hangoutCopy}>Fresh 90s one-liners, all day.</span>
          </PrefetchLink>
          <PrefetchLink href="/forum" className={styles.hangoutCard}>
            <span className={styles.hangoutTitle}>Forum</span>
            <span className={styles.hangoutCopy}>Post memories and hot takes.</span>
          </PrefetchLink>
          <PrefetchLink href="/on-this-day-in-the-90s" className={styles.hangoutCard}>
            <span className={styles.hangoutTitle}>On This Day</span>
            <span className={styles.hangoutCopy}>Timeline moments from 1990–1999.</span>
          </PrefetchLink>
          <PrefetchLink href="/category#blast-from-the-past" className={styles.hangoutCard}>
            <span className={styles.hangoutTitle}>Blast From Past</span>
            <span className={styles.hangoutCopy}>One iconic throwback at a time.</span>
          </PrefetchLink>
        </div>
      </section>
    </div>
  );
}

async function fetchArticlesByCategory(cat: string): Promise<Article[]> {
  try {
    return await getArticlesByCategory(cat, { limit: 12 });
  } catch {
    return [];
  }
}

async function fetchTrending(limit = 6): Promise<Article[]> {
  try {
    const res = await fetch(API_ROUTES.ARTICLE.TRENDING(limit), {
      next: { revalidate: 120 },
    });
    if (!res.ok) return [];
    return (await res.json()) as Article[];
  } catch {
    return [];
  }
}
