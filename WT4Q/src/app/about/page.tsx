import styles from './page.module.css';

export const metadata = {
  title: 'About WT4Q',
};

export default function AboutPage() {
  return (
    <div className={styles.container}>
      <h1 className={styles.title}>About WT4Q</h1>
      <p>
        WT4Q began as a weekend experiment among a few neighbors who wanted a
        single page where they could check the weather, scan the latest
        headlines, and unwind with a quick puzzle. What started as a hobby has
        gradually grown into a daily habit for readers across the region. The
        site may look larger today, yet our purpose is unchanged: to offer a
        friendly corner of the internet where people stay informed, find
        practical tools, and feel connected to one another.
      </p>
      <p>
        We are fiercely independent. WT4Q has no corporate owners, political
        donors, or advertising networks steering our coverage. Stories appear
        because they affect real people who live where we do. Every fact is
        double‑checked through public records or direct conversations, and if we
        make a mistake we post a correction prominently. Trust is earned article
        by article, and we work hard to keep it.
      </p>
      <p>
        Our reporting blends neighborhood detail with broader context. A zoning
        vote, school board decision, or global event can all ripple through daily
        life, so we break down the implications in plain language. Quick updates
        keep you informed as news unfolds, while follow‑up explainers step back
        and show the bigger picture. We want readers to understand not just what
        happened, but why it matters.
      </p>
      <p>
        WT4Q offers more than news. Our weather dashboard aggregates data from
        multiple sources to deliver hour‑by‑hour forecasts and storm alerts.
        Practical utilities like gas‑price trackers, transit updates, and
        community calendars share space with light‑hearted games for a short
        break. The site is designed to be useful at dawn, during lunch, or when
        you wind down after dinner.
      </p>
      <p>
        Community participation keeps the site vibrant. Readers send tips, share
        photos, and suggest story ideas that often become our most popular
        pieces. Comments are moderated for civility, but we invite spirited
        debate and credit contributors whenever possible. If you see something
        that deserves coverage or notice an error, we want to hear from you.
        WT4Q is a collaboration with its audience.
      </p>
      <p>
        Accessibility and privacy guide our technical choices. Pages load
        quickly on phones, adhere to WCAG standards, and avoid intrusive
        tracking. We use only essential cookies and plainly explain why they
        exist. New features undergo a review to ensure they conserve bandwidth
        and energy. Serving information responsibly is part of serving our
        readers.
      </p>
      <p>
        Behind the scenes, WT4Q runs on open-source software maintained by
        volunteers. Publishing our code allows others to audit how we handle
        data, suggest improvements, or adapt tools for their own communities.
        Transparency in both journalism and technology keeps us accountable and
        encourages collaboration with developers, designers, and civic groups
        who share our goals.
      </p>
      <p>
        The future holds new sections, a newsletter, and perhaps even a meetup or
        two, but our north star remains service. Thank you for reading, sharing,
        and supporting WT4Q. Together we can nurture a digital front porch where
        information is reliable, neighbors connect, and curiosity is always
        welcome.
      </p>
    </div>
  );
}
