import type { Metadata } from 'next';
import PrefetchLink from '@/components/PrefetchLink';
import { API_ROUTES } from '@/lib/api';
import type { Article } from '@/components/ArticleCard';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: 'Forum | The Nineties Times',
  description: 'Join the community lounge to chat about 90s memories and stories.',
  alternates: { canonical: '/forum' },
};

async function fetchThreads(): Promise<Article[]> {
  try {
    const res = await fetch(API_ROUTES.ARTICLE.TRENDING(12), { cache: 'no-store' });
    if (!res.ok) return [];
    return (await res.json()) as Article[];
  } catch {
    return [];
  }
}

export default async function ForumPage() {
  const threads = await fetchThreads();

  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <span className={styles.kicker}>Forum lounge</span>
        <h1>90s Community Forum</h1>
        <p>Swap memories, debate favorites, and keep the decade alive together.</p>
      </header>

      <section className={styles.threadList}>
        {threads.length === 0 ? (
          <div className={styles.empty}>
            Threads are loading. Check back soon for fresh conversation starters.
          </div>
        ) : (
          threads.map((thread) => (
            <PrefetchLink
              key={thread.id}
              href={`/articles/${thread.slug}`}
              className={styles.thread}
            >
              <span className={styles.threadTitle}>{thread.title}</span>
              <span className={styles.threadMeta}>
                {thread.commentsCount ? `${thread.commentsCount} replies` : 'Start the conversation'}
              </span>
            </PrefetchLink>
          ))
        )}
      </section>
    </div>
  );
}
