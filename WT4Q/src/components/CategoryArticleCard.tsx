import PrefetchLink from '@/components/PrefetchLink';
import styles from './CategoryArticleCard.module.css';
import type { Article } from '@/components/ArticleCard';

function truncateWords(html: string, words: number) {
  const text = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  const parts = text.split(' ');
  return parts.length <= words ? text : parts.slice(0, words).join(' ') + '…';
}

export default function CategoryArticleCard({ article }: { article: Article }) {
  const snippet = truncateWords(article.content || article.summary || '', 30);
  return (
    <div className={styles.card}>
      <h3 className={styles.title}>{article.title}</h3>
      <p
        className={styles.snippet}
        dangerouslySetInnerHTML={{ __html: snippet }}
      />
      <PrefetchLink
        href={`/articles/${article.slug}`}
        className={styles.readMore}
      >
        Read more
      </PrefetchLink>
    </div>
  );
}
