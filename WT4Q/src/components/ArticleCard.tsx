import PrefetchLink from '@/components/PrefetchLink';
import styles from './ArticleCard.module.css';
import { truncateWords } from '@/lib/text';

export interface Article {
  id: string;
  title: string;
  summary: string;
}

export default function ArticleCard({ article }: { article: Article }) {
  const snippet = truncateWords(article.summary);
  return (
    <PrefetchLink href={`/articles/${article.id}`} className={styles.card}>
      <h2 className={styles.title}>{article.title}</h2>
      <p className={styles.summary}>{snippet}</p>
      <span className={styles.readMore}>Read more</span>
    </PrefetchLink>
  );
}
