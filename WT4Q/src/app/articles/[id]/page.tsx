// app/articles/[id]/page.tsx

import ArticleCard, { Article } from '@/components/ArticleCard';
import Image from 'next/image';
import CommentsSection, { Comment } from '@/components/CommentsSection';
import LikeButton from '@/components/LikeButton';
import { API_ROUTES } from '@/lib/api';
import type { Metadata } from 'next';
import styles from '../article.module.css';
import type { ArticleImage } from '@/lib/models';

/* ---------------------- types ---------------------- */

interface ArticleDetails {
  id: string;
  title: string;
  content: string;
  createdDate: string;
  isBreakingNews?: boolean;
  countryName?: string;
  images?: ArticleImage[];
  embededCode?: string;
  author?: { adminName?: string };
  comments?: Comment[];
  like?: { id: number }[];
}

/* ---------------------- image utils ---------------------- */

const ALLOWED_IMAGE_HOSTS = new Set<string>([
  'encrypted-tbn0.gstatic.com',
  // keep in sync with next.config.js -> images.domains
]);

function isValidImageForNextImage(src?: string): boolean {
  if (!src) return false;
  if (src.startsWith('data:image/')) return true; // allowed if we pass unoptimized
  if (src.startsWith('/')) return true;           // site-relative
  try {
    const u = new URL(src);
    return (u.protocol === 'http:' || u.protocol === 'https:') &&
           ALLOWED_IMAGE_HOSTS.has(u.hostname);
  } catch {
    return false;
  }
}

function toAbsoluteIfRelative(src: string, siteUrl: string): string {
  if (!src) return src;
  if (src.startsWith('/')) {
    return new URL(src, siteUrl).toString();
  }
  return src;
}

/* ---------------------- data ---------------------- */

async function fetchArticle(id: string): Promise<ArticleDetails | null> {
  try {
    const res = await fetch(API_ROUTES.ARTICLE.GET_BY_ID(id), { cache: 'no-store' });
    if (!res.ok) return null;
    const raw = await res.json();
    return raw as ArticleDetails;
  } catch {
    return null;
  }
}

async function fetchRelated(id: string): Promise<Article[]> {
  try {
    const res = await fetch(API_ROUTES.ARTICLE.GET_RECOMMENDATIONS(id), { cache: 'no-store' });
    if (!res.ok) return [];
    return (await res.json()) as Article[];
  } catch {
    return [];
  }
}

/* ---------------------- metadata ---------------------- */

export async function generateMetadata(
  props: { params: Promise<{ id: string }> }   // <-- accept async params
): Promise<Metadata> {
  const { id } = await props.params;           // <-- await before using
  const article = await fetchArticle(id);
  if (!article) return {};

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const url = new URL(`/articles/${id}`, siteUrl).toString();

  const description = (article.content || '').slice(0, 160);

  // Prefer a proper, reachable URL for OG (many scrapers ignore data:)
  let ogImage: string | undefined = undefined;
  const firstImg = article.images?.[0];
  if (firstImg?.photoLink && isValidImageForNextImage(firstImg.photoLink)) {
    ogImage = toAbsoluteIfRelative(firstImg.photoLink, siteUrl);
  }
  // (If needed, you could generate and host an OG preview, then set ogImage)

  return {
    title: article.title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title: article.title,
      description,
      url,
      type: 'article',
      images: ogImage ? [{ url: ogImage }] : undefined,
    },
  };
}

/* ---------------------- page ---------------------- */

export default async function ArticlePage(
  props: { params: Promise<{ id: string }> }   // <-- accept async params
) {
  const { id } = await props.params;           // <-- await before using

  const article = await fetchArticle(id);
  if (!article) {
    return <div className={styles.container}>Article not found.</div>;
  }

  const isBreakingActive =
    !!article.isBreakingNews &&
    new Date(article.createdDate) >= new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);

  const related = await fetchRelated(id);

  return (
    <div className={styles.newspaper}>
      <article className={styles.main}>
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
        {article.images && article.images.length > 0 && (
          <div className={article.images.length > 1 ? styles.gallery : undefined}>
            {article.images.map((img, idx) => {
              const base64 = img.photo ? `data:image/jpeg;base64,${img.photo}` : undefined;
              const validLink = img.photoLink && isValidImageForNextImage(img.photoLink)
                ? img.photoLink
                : undefined;
              const src = validLink ?? base64;
              if (!src) return null;
              const useNext = isValidImageForNextImage(src);
              return (
                <figure key={idx} className={styles.figure}>
                  {useNext ? (
                    <Image
                      src={src}
                      alt={img.altText || article.title}
                      className={styles.image}
                      width={700}
                      height={400}
                      unoptimized={src.startsWith('data:')}
                    />
                  ) : (
                    <img
                      src={src}
                      alt={img.altText || article.title}
                      className={styles.image}
                      width={700}
                      height={400}
                    />
                  )}
                  {img.caption && (
                    <figcaption className={styles.caption}>{img.caption}</figcaption>
                  )}
                </figure>
              );
            })}
          </div>
        )}
        {article.embededCode && (
          <div
            className={styles.embed}
            dangerouslySetInnerHTML={{ __html: article.embededCode }}
          />
        )}
        <p className={styles.content}>{article.content}</p>
        <LikeButton articleId={id} initialCount={article.like?.length ?? 0} />
        <CommentsSection
          articleId={id}
          initialComments={article.comments ?? []}
        />
      </article>
      {related.length > 0 && (
        <aside className={styles.sidebar}>
          <h2 className={styles.relatedHeading}>Recommended Articles</h2>
          {related.map((a) => (
            <ArticleCard key={a.id} article={a} />
          ))}
        </aside>
      )}
    </div>
  );
}
