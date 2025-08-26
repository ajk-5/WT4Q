import PrefetchLink from '@/components/PrefetchLink';
import { CATEGORIES } from '@/lib/categories';
import styles from './category.module.css';

export const metadata = {
  title: 'Categories - WT4Q',
};

export default function CategoriesPage() {
  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Categories</h1>
      <div className={styles.grid}>
        {CATEGORIES.map((c) => (
          <PrefetchLink
            key={c}
            href={`/category/${c}`}
            className={styles.categoryLink}
          >
            {c}
          </PrefetchLink>
        ))}
      </div>
    </div>
  );
}
