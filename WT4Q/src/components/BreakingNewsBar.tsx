import BreakingNewsSlider, { BreakingArticle } from './BreakingNewsSlider';
import { API_ROUTES } from '@/lib/api';
import styles from './BreakingNewsBar.module.css';

export default async function BreakingNewsBar() {
  try {
    const res = await fetch(API_ROUTES.ARTICLE.BREAKING, { cache: 'no-store' });
    if (!res.ok) return null;
    const articles: BreakingArticle[] = await res.json();
    if (!Array.isArray(articles) || articles.length === 0) return null;
    return <BreakingNewsSlider articles={articles} className={styles.bar} />;
  } catch {
    return null;
  }
}
