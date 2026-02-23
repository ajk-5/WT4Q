import type { Metadata } from 'next';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: 'About The Nineties Times',
  description:
    'Discover how The Nineties Times (90sTimes) keeps 90s nostalgia alive with stories, quizzes, arcade throwbacks, and community memories.',
  keywords: [
    '90s nostalgia',
    'retro culture',
    'time capsule',
    '90s quizzes',
    'The Nineties Times',
    '90sTimes community',
  ],
  alternates: { canonical: '/about' },
  openGraph: {
    title: 'About The Nineties Times',
    description:
      'Meet the team behind The Nineties Times (90sTimes) and learn how we build a 90s nostalgia hub.',
    url: '/about',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'About The Nineties Times',
    description:
      'Learn how The Nineties Times blends throwback stories, quizzes, and community memories into a 90s time capsule.',
  },
};

export default function AboutPage() {
  return (
    <div className={styles.container}>
      <h1 className={styles.title}>About The Nineties Times</h1>
      <p>
        The Nineties Times is a 90s time capsule built for nostalgia lovers. We
        celebrate the decade with stories, quizzes, arcade throwbacks, and
        memory-lane moments that feel like flipping through an old magazine
        with your favorite mixtape on.
      </p>
      <p>
        Our mission is to make the 90s feel alive again. We refresh the site
        with new 90s-inspired features on a regular cadence, from pop culture
        deep dives to throwback guides. Gemini AI helps us generate fresh
        quizzes, playful lists, and nostalgic features while we keep the tone
        human, fun, and accessible.
      </p>
      <p>
        Everything is organized into 90s-friendly categories like TV, Movies &
        Music, Gadgets & Internet, Style & Snacks, and Time Capsule. You can
        jump into the arcade, take a trivia quiz, or head to the forum to swap
        memories with other fans of the decade.
      </p>
      <p>
        We integrate trusted external services to keep the experience smooth
        and secure. Google sign-in makes it easy to join the community, and
        modern security practices keep your account safe while you explore the
        site.
      </p>
      <p>
        The goal is simple: bring back the decade you love and make it a place
        you want to visit often. We are always adding new content, games, and
        community features to keep the 90s alive.
      </p>
      <h2 className={styles.heading}>Crypto Markets at 90sTimes</h2>
      <p>
        We keep the Crypto section for readers who track markets. Prices and
        24-hour stats for top assets come from public APIs (for example, Binance
        for USDT pairs) and market-cap rankings from CoinGecko. Clicking any
        asset opens a candlestick chart with multiple timeframes (1m to 1y).
        This feature is informational only and is not investment advice.
      </p>
      <p>
        To keep pages fast, we briefly cache small responses and store optional
        display preferences (such as your last selected symbol or timeframe) in
        your browser. You can clear these any time. Data may be delayed or
        unavailable; we cannot guarantee accuracy. Always do your own research.
      </p>
      <p>
        Next up: community challenges, more retro games, and a nostalgia
        newsletter.
      </p>
    </div>
  );
}
