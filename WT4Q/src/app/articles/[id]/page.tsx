import ArticleCard, { Article } from '@/components/ArticleCard';
import Image from 'next/image';
import CommentsSection, { Comment } from '@/components/CommentsSection';
import LikeButton from '@/components/LikeButton';
import { API_ROUTES } from '@/lib/api';
import type { Metadata } from 'next';
import styles from '../article.module.css';

interface ArticleDetails {
  id: string;
  title: string;
  description: string;
  createdDate: string;
  isBreakingNews?: boolean;
  countryName?: string;
  photo?: string[];
  photoLink?: string;
  embededCode?: string;
  altText?: string;
  author?: { adminName?: string };
  comments?: Comment[];
  like?: { id: number }[];
}

async function fetchArticle(id: string): Promise<ArticleDetails | null> {
  try {
    const res = await fetch(API_ROUTES.ARTICLE.GET_BY_ID(id), { cache: 'no-store' });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

async function fetchRelated(id: string): Promise<Article[]> {
  try {
    const res = await fetch(API_ROUTES.ARTICLE.GET_RECOMMENDATIONS(id), { cache: 'no-store' });
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const article = await fetchArticle(id);
  if (!article) return {};
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const url = `${siteUrl}/articles/${id}`;
  const description = article.description.slice(0, 160);
  const image = article.photoLink || (article.photo && article.photo.length > 0 ? `data:image/jpeg;base64,${article.photo[0]}` : undefined);
  return {
    title: article.title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title: article.title,
      description,
      url,
      type: 'article',
      images: image ? [{ url: image }] : undefined,
    },
  };
}


export default async function ArticlePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const article = await fetchArticle(id);
  if (!article) {
    return <div className={styles.container}>Article not found.</div>;
  }
  const isBreakingActive =
    article.isBreakingNews &&
    new Date(article.createdDate) >=
      new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
  const related = await fetchRelated(id);
  return (
    <div className={styles.container}>
      {isBreakingActive && (
        <div className={styles.breaking}>Breaking News</div>
      )}
      <h1 className={styles.title}>{article.title}</h1>
      <p className={styles.meta}>
        {new Date(article.createdDate).toLocaleDateString(undefined, {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })}
        {article.countryName ? ` | ${article.countryName}` : ''}
        {article.author?.adminName ? ` – ${article.author.adminName}` : ''}
      </p>
      {(article.photoLink || (article.photo && article.photo.length > 0)) && (
        <Image
          src={
            article.photoLink ||
            `data:image/jpeg;base64,${article.photo?.[0] ?? ''}`
          }
          alt={article.altText || article.title}
          className={styles.image}
          width={700}
          height={400}
        />
      )}
      {article.embededCode && (
        <div
          className={styles.embed}
          dangerouslySetInnerHTML={{ __html: article.embededCode }}
        />
      )}
      <p className={styles.content}>{article.description}</p>
      <LikeButton articleId={id} initialCount={article.like?.length || 0} />
      <CommentsSection articleId={id} initialComments={article.comments || []} />
      {related.length > 0 && (
        <section>
          <h2 className={styles.relatedHeading}>Related Articles</h2>
          <div className={styles.grid}>
            {related.map((a) => (
              <ArticleCard key={a.id} article={a} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
