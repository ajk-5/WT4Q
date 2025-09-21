import type { Metadata } from 'next';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: 'About The Nineties Times',
  description: "Discover how The Nineties Times (90sTimes) delivers breaking news, fact-checked reporting, and culture coverage with an independent newsroom built for today's readers.",
  keywords: [
    'independent news brand',
    'breaking news 2025',
    'unbiased journalism',
    'digital newsroom team',
    'The Nineties Times',
    '90sTimes editors',
    'fact checked reporting'
  ],
  alternates: { canonical: '/about' },
  openGraph: {
    title: 'About The Nineties Times',
    description: "Meet the team behind The Nineties Times (90sTimes) and learn how we deliver independent, breaking news coverage across politics, business, tech, sport, and culture.",
    url: '/about',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'About The Nineties Times',
    description: "Learn how The Nineties Times newsroom combines trusted reporting, emerging tech, and reader-first coverage to deliver the day's biggest stories.",
  },
};

export default function AboutPage() {
  return (
    <div className={styles.container}>
      <h1 className={styles.title}>About The Nineties Times</h1>
      <p>
        We are an independent, trustworthy newsroom focused on accuracy and balance. Our reporting stands apart from political affiliation and shows respect for all communities.
      </p>
      <p>
The Nineties Times is an interactive website created to keep you informed, entertained, and engaged all in one place. It provides the latest news, articles, and information on a wide variety of topics including politics, crime, entertainment, business, health, lifestyle, sports, and weather. But The Nineties Times is more than just a news site—it also offers fun games, useful tools, and interactive features to make the experience enjoyable for every type of user.
</p>

<p>
At the heart of The Nineties Times lies the power of Google’s Gemini AI, which helps automate the platform and ensure that the content you see is personalized and relevant. The website is managed by a team of administrators and super administrators who act as authors, publishing and curating articles. Meanwhile, users are encouraged to engage with content by commenting, liking, and sharing their thoughts, creating a lively and connected community.
</p>

<p>
The Nineties Times also integrates smart external services to make your experience richer. The weather section, powered by the reliable MET.no API, gives you real-time and accurate weather updates. There’s also a world clock that not only shows the current time in major cities around the globe but also provides live weather information for those locations. On top of this, news and articles are personalized to match your location, so you always stay updated with what matters most to you.
</p>

<p>
Security is a top priority for The Nineties Times. The platform uses Bcrypt encryption to protect user data and integrates Google OAuth for secure authentication. This ensures that every user can browse, interact, and participate with complete peace of mind. By combining the intelligence of AI with trusted external APIs, The Nineties Times delivers a comprehensive digital hub where staying informed is effortless, engaging, and secure.
</p>
<h2 className={styles.heading}>Crypto Markets at 90sTimes</h2>
<p>
We offer a transparent Crypto section to help readers understand market
movements at a glance. Prices and 24‑hour stats for top assets are sourced
from public APIs (e.g., Binance for USDT pairs) and market‑cap rankings from
CoinGecko. Clicking any asset opens a candlestick chart with multiple
timeframes (1m to 1y). News items related to a coin are aggregated via Google
News RSS. This feature is informational only—we do not provide trading, hold
funds, or offer investment advice.
</p>
<p>
To keep pages fast, we briefly cache small responses and store optional
display preferences (such as your last selected symbol or timeframe) in your
browser. You can clear these any time. Data may be delayed or unavailable; we
cannot guarantee accuracy. Always do your own research.
</p>
<p>Our next top priority is Newsletter functionality. We are working on it and will be published after some week.</p>
    </div>
  );
}
