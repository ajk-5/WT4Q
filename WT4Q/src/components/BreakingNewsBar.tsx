import BreakingNewsSlider, { BreakingArticle } from './BreakingNewsSlider';
import { API_ROUTES } from '@/lib/api';
import styles from './BreakingNewsBar.module.css';

export default async function BreakingNewsBar() {
  try {
    // Fetch all articles so the bar shows the latest news rather than
    // only items flagged as "breaking".
    const res = await fetch(API_ROUTES.ARTICLE.GET_ALL, { cache: 'no-store' });
    if (!res.ok) return null;

    // Map the API response to the minimal shape expected by the slider.
    const allArticles = (await res.json()) as { id: string; title: string }[];
    const articles: BreakingArticle[] = (allArticles || []).map((a) => ({
      id: a.id,
      title: a.title,
    }));

    if (articles.length === 0) return null;
    return <BreakingNewsSlider articles={articles} className={styles.bar} />;
  } catch {
    return null;
  }
}
