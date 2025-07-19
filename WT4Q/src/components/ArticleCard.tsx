import Link from 'next/link';
import styles from './ArticleCard.module.css';

export interface Article {
  id: string;
  title: string;
  summary: string;
}

export default function ArticleCard({ article }: { article: Article }) {
  return (
    <Link href={`/articles/${article.id}`} className={styles.card}>
      <h2 className={styles.title}>{article.title}</h2>
      <p className={styles.summary}>{article.summary}</p>
      <span className={styles.readMore}>Read more</span>
    </Link>
  );
}
