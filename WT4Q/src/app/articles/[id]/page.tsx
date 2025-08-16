// app/articles/[id]/page.tsx

import Image from 'next/image';
import CommentsSection, { Comment } from '@/components/CommentsSection';
import ReactionButtons from '@/components/ReactionButtons';
import { API_ROUTES } from '@/lib/api';
import type { Metadata } from 'next';
import styles from '../article.module.css';
import type { ArticleImage } from '@/lib/models';
import PrefetchLink from '@/components/PrefetchLink';

/* ---------------------- types ---------------------- */

interface ArticleDetails {
  id: string;
  title: string;
  summary?: string;
  content: string;
  createdDate: string;
  isBreakingNews?: boolean;
  countryName?: string;
  images?: ArticleImage[];
  embededCode?: string;
  author?: { adminName?: string };
  comments?: Comment[];
  like?: { id: number; type: number }[];
}

interface RelatedArticle {
  id: string;
  title: string;
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

async function fetchRelated(id: string): Promise<RelatedArticle[]> {
  try {
    const res = await fetch(API_ROUTES.ARTICLE.GET_RECOMMENDATIONS(id), { cache: 'no-store' });
    if (!res.ok) return [];
    return (await res.json()) as RelatedArticle[];
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

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL || 'https://www.wt4q.com';
  const url = new URL(`/articles/${id}`, siteUrl).toString();

  const description =
    article.summary || (article.content || '').slice(0, 160);

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

  const likeCount = article.like?.filter((l) => l.type === 0).length ?? 0;
  const dislikeCount = article.like?.filter((l) => l.type === 2).length ?? 0;

  return (
    <div className={styles.newspaper}>
      <article className={styles.main}>
        {isBreakingActive && (
          <div className={styles.breaking}>Breaking News</div>
        )}
        <h1 className={styles.title}>{article.title}</h1>
        {article.summary && (
          <p className={styles.summary}>{article.summary}</p>
        )}
          <p className={styles.meta}>
            {new Date(article.createdDate).toLocaleDateString(undefined, {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
            {article.countryName ? ` | ${article.countryName}` : ''}
            {article.author?.adminName ? ` – ${article.author.adminName}` : ''}
          </p>
          {related.length > 0 && (
            <p className={styles.relatedBar}>
              {related.map((a, i) => (
                <span key={a.id}>
                  <PrefetchLink href={`/articles/${a.id}`}>{a.title}</PrefetchLink>
                  {i < related.length - 1 && (
                    <span className={styles.separator}>|</span>
                  )}
                </span>
              ))}
            </p>
          )}
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
        <div
          className={styles.content}
          dangerouslySetInnerHTML={{ __html: article.content }}
        />
        <ReactionButtons
          articleId={id}
          initialLikes={likeCount}
          initialDislikes={dislikeCount}
        />
        <CommentsSection
          articleId={id}
          initialComments={article.comments ?? []}
        />
      </article>
      </div>
    );
  }
