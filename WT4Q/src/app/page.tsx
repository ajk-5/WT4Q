import Image from 'next/image';
import Script from 'next/script';
import type { Metadata } from 'next';
import {
  Archive,
  CalendarDays,
  Gamepad2,
  Laugh,
  MessageCircle,
  Radio,
  Search,
} from 'lucide-react';
import BreakingCenterpiece from '@/components/BreakingCenterpiece';
import TrendingCenterpiece from '@/components/TrendingCenterpiece';
import PrefetchLink from '@/components/PrefetchLink';
import BelowCenterpieceAd from '@/components/ads/BelowCenterpieceAd';
import ResponsiveFluidAd from '@/components/ads/ResponsiveFluidAd';
import { CATEGORY_DEFINITIONS } from '@/lib/categories';
import { VAULT_BASE } from '@/lib/vaultPaths';
import { DEFAULT_OG_IMAGE, SITE_DESCRIPTION, SITE_NAME, SITE_URL, robotsDirectives } from '@/lib/seo';
import { loadHomePageContent } from '@/lib/server/home';
import styles from './page.module.css';

export const revalidate = 180;

export const metadata: Metadata = {
  title: 'The Nineties Times: 90s Stories, Quizzes, Jokes, and Arcade',
  description:
    'The Nineties Times is a daily 90s nostalgia hub for culture stories, on-this-day capsules, quizzes, jokes, arcade games, and retro community memories.',
  keywords: [
    'The Nineties Times',
    '90sTimes',
    '90stimes',
    '90s nostalgia',
    '90s articles',
    '90s jokes',
    '90s quizzes',
    'retro arcade games',
    'on this day in the 90s',
  ],
  alternates: { canonical: '/' },
  robots: robotsDirectives,
  openGraph: {
    title: 'The Nineties Times - 90s nostalgia, daily drops, and retro arcade',
    description:
      'Daily 90s stories, jokes, quizzes, arcade throwbacks, and time-capsule culture from The Nineties Times.',
    url: '/',
    type: 'website',
    images: [
      {
        url: DEFAULT_OG_IMAGE,
        width: 1200,
        height: 630,
        alt: 'The Nineties Times logo',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'The Nineties Times',
    description: SITE_DESCRIPTION,
    images: [DEFAULT_OG_IMAGE],
  },
};

const issue = new Intl.DateTimeFormat('en-US', {
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
}).format(new Date());

const dailySections = [
  {
    href: VAULT_BASE,
    label: '90s Exclusive',
    copy: 'Deep-cut culture, quizzes, and curated vault material.',
    icon: Archive,
  },
  {
    href: '/on-this-day-in-the-90s',
    label: 'On This Day',
    copy: 'A verified timeline when facts are available, otherwise an honest date capsule.',
    icon: CalendarDays,
  },
  {
    href: '/jokes',
    label: 'Jokes',
    copy: 'Fresh one-liners with duplicate filtering behind the scenes.',
    icon: Laugh,
  },
  {
    href: '/arcade',
    label: 'Arcade',
    copy: 'Fast retro games when you need a break from reading.',
    icon: Gamepad2,
  },
  {
    href: '/forum',
    label: 'Forum',
    copy: 'Community memories, debates, and rankings from the decade.',
    icon: MessageCircle,
  },
];

export default async function Home() {
  const { latestArticles, spotlightArticles, trendingArticles } = await loadHomePageContent();
  const topArticle = spotlightArticles[0];
  const secondaryLatest = latestArticles
    .filter((article) => article.slug !== topArticle?.slug)
    .slice(0, 3);
  const siteUrl = SITE_URL;
  const pageUrl = new URL('/', siteUrl).toString();

  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: SITE_NAME,
      url: pageUrl,
      description:
        'Daily 90s nostalgia stories, jokes, quizzes, arcade games, and time-capsule culture.',
      isPartOf: {
        '@type': 'WebSite',
        name: SITE_NAME,
        url: siteUrl,
      },
      about: [
        '1990s culture',
        '90s nostalgia',
        'retro games',
        '90s jokes',
        '90s quizzes',
      ],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: 'The Nineties Times homepage highlights',
      itemListElement: spotlightArticles.slice(0, 6).map((article, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        url: new URL(`/articles/${article.slug}`, siteUrl).toString(),
        name: article.title,
      })),
    },
  ];

  return (
    <div className={styles.home}>
      <Script id="ld-homepage" type="application/ld+json" strategy="afterInteractive">
        {JSON.stringify(jsonLd)}
      </Script>

      <section className={styles.hero} aria-labelledby="home-title">
        <div className={styles.heroCopy}>
          <span className={styles.eyebrow}>Issue {issue} | Daily 90s dispatch</span>
          <h1 id="home-title">The Nineties Times</h1>
          <p>
            A living time capsule for 90s stories, jokes, quizzes, arcade breaks, and
            pop-culture rabbit holes that still feel strangely current.
          </p>

          <div className={styles.heroActions}>
            {topArticle && (
              <PrefetchLink href={`/articles/${topArticle.slug}`} className={styles.heroButtonPrimary}>
                Read the lead story
              </PrefetchLink>
            )}
            <PrefetchLink href="/search" className={styles.heroButtonSecondary}>
              <Search size={18} aria-hidden="true" />
              Search the archive
            </PrefetchLink>
          </div>
        </div>

        <div className={styles.heroMedia} aria-label="The Nineties Times daily edition">
          <div className={styles.mediaTop}>
            <span>Now Loading</span>
            <Radio size={18} aria-hidden="true" />
          </div>
          <div className={styles.logoPlate}>
            <Image
              src="/images/90stimeslogo.png.jpg"
              alt="The Nineties Times"
              width={360}
              height={220}
              priority
              sizes="(max-width: 768px) 72vw, 360px"
            />
          </div>
          <div className={styles.signalGrid}>
            <span>Daily drops</span>
            <span>Fresh jokes</span>
            <span>90s vault</span>
          </div>
        </div>
      </section>

      <section className={styles.issueGrid} aria-label="Current edition">
        <div className={styles.leadColumn}>
          <div className={styles.sectionHeader}>
            <span className={styles.kicker}>Cover story</span>
            {topArticle && (
              <PrefetchLink href={`/articles/${topArticle.slug}`} className={styles.sectionAction}>
                Open lead
              </PrefetchLink>
            )}
          </div>
          <BreakingCenterpiece articles={spotlightArticles} label="Time Capsule Spotlight" />
          <BelowCenterpieceAd />
        </div>

        <aside className={styles.editionPanel} aria-label="Edition guide">
          <div className={styles.editionBlock}>
            <div className={styles.panelHeader}>
              <span className={styles.kicker}>Daily sections</span>
              <h2>Start here</h2>
            </div>
            <nav className={styles.sectionList} aria-label="Daily sections">
              {dailySections.map(({ href, label, copy, icon: Icon }) => (
                <PrefetchLink key={href} href={href} className={styles.sectionLink}>
                  <span className={styles.sectionIcon}>
                    <Icon size={18} aria-hidden="true" />
                  </span>
                  <span>
                    <strong>{label}</strong>
                    <small>{copy}</small>
                  </span>
                </PrefetchLink>
              ))}
            </nav>
          </div>

          {secondaryLatest.length > 0 && (
            <div className={styles.editionBlock}>
              <div className={styles.panelHeader}>
                <span className={styles.kicker}>Latest queue</span>
                <h2>Next reads</h2>
              </div>
              <div className={styles.compactList}>
                {secondaryLatest.map((article) => (
                  <PrefetchLink
                    key={article.id}
                    href={`/articles/${article.slug}`}
                    className={styles.compactLink}
                  >
                    <strong>{article.title}</strong>
                    <small>
                      {article.createdDate
                        ? new Intl.DateTimeFormat('en-US', {
                            month: 'short',
                            day: 'numeric',
                            timeZone: 'UTC',
                          }).format(new Date(article.createdDate))
                        : 'New drop'}
                    </small>
                  </PrefetchLink>
                ))}
              </div>
            </div>
          )}
        </aside>
      </section>

      <section className={styles.featureBand} aria-label="Trending stories">
        <div className={styles.sectionHeader}>
          <span className={styles.kicker}>Most loved right now</span>
          <PrefetchLink href="/trending" className={styles.sectionAction}>
            View all
          </PrefetchLink>
        </div>
        <TrendingCenterpiece articles={trendingArticles} />
        <BelowCenterpieceAd />
      </section>

      <section className={styles.channels} aria-labelledby="channels-title">
        <div className={styles.sectionHeader}>
          <div>
            <span className={styles.kicker}>Archive channels</span>
            <h2 id="channels-title">Browse the decade by obsession</h2>
          </div>
          <PrefetchLink href="/category" className={styles.sectionAction}>
            All channels
          </PrefetchLink>
        </div>

        <div className={styles.channelGrid}>
          {CATEGORY_DEFINITIONS.map((category) => (
            <PrefetchLink
              key={category.key}
              href={`/category/${encodeURIComponent(category.key)}`}
              className={styles.channelCard}
            >
              <span>{category.label}</span>
              <small>{category.description}</small>
            </PrefetchLink>
          ))}
        </div>
        <ResponsiveFluidAd />
      </section>

    </div>
  );
}
