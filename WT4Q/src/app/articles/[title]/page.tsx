// app/articles/[title]/page.tsx

import Image from 'next/image';
import Script from 'next/script';
import { Inter } from 'next/font/google';
import dynamic from 'next/dynamic';
import type { Comment } from '@/components/CommentsSection';
import { API_ROUTES } from '@/lib/api';
import type { Metadata } from 'next';
import styles from '../article.module.css';
export const revalidate = 300; // ISR article page revalidation

// Preload Inter font only on article pages to scope font preloading
const articleInter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
  display: 'swap',
  preload: true,
});
import type { ArticleImage } from '@/lib/models';
import PrefetchLink from '@/components/PrefetchLink';
import ArticleTTS from '@/components/ArticleTTS';
const ReactionButtons = dynamic(() => import('@/components/ReactionButtons'));
const CommentsSection = dynamic(() => import('@/components/CommentsSection'));
const LocalArticleSection = dynamic(() => import('@/components/LocalArticleSection'));
import { reactionNameFromType } from '@/components/ReactionIcon';
import { stripHtml } from '@/lib/text';

/* ---------------------- types ---------------------- */

interface ArticleDetails {
  id: string;

  slug: string;

  title: string;
  summary?: string;
  content: string;
  createdDate: string;
  isBreakingNews?: boolean;
  countryName?: string;
  images?: ArticleImage[];
  embededCode?: string;
  comments?: Comment[];
  like?: { id: number; type: number | string }[];
  views?: number;
  keywords?: string[];
}

interface RelatedArticle {
  slug: string;
  title: string;
}

/* ---------------------- image utils ---------------------- */

function isValidImageForNextImage(src?: string): boolean {
  if (!src) return false;
  if (src.startsWith('data:image/')) return true; // allowed if we pass unoptimized
  if (src.startsWith('/')) return true;           // site-relative
  try {
    const u = new URL(src);
    return (u.protocol === 'http:' || u.protocol === 'https:');
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

async function fetchArticle(slug: string): Promise<ArticleDetails | null> {
  try {
    const res = await fetch(API_ROUTES.ARTICLE.GET_BY_SLUG(slug), { next: { revalidate: 300 } });
    if (!res.ok) return null;
    const raw = await res.json();
    return raw as ArticleDetails;
  } catch {
    return null;
  }
}

async function fetchRelated(slug: string): Promise<RelatedArticle[]> {
  try {
    const res = await fetch(API_ROUTES.ARTICLE.GET_RECOMMENDATIONS(slug), { next: { revalidate: 600 } });
    if (!res.ok) return [];
    return (await res.json()) as RelatedArticle[];
  } catch {
    return [];
  }
}

/* ---------------------- metadata ---------------------- */

export async function generateMetadata(
  props: { params: Promise<{ title: string }> }   // <-- accept async params
): Promise<Metadata> {
  const { title } = await props.params;           // <-- await before using
  const article = await fetchArticle(title);
  if (!article) return {};

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL || 'https://www.90stimes.com';
  const url = new URL(`/articles/${title}`, siteUrl).toString();

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
    keywords: article.keywords,
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
  props: { params: Promise<{ title: string }> }   // <-- accept async params
) {
  const { title } = await props.params;           // <-- await before using

  const article = await fetchArticle(title);
  if (!article) {
    return <div className={styles.container}>Article not found.</div>;
  }

  const isBreakingActive =
    !!article.isBreakingNews &&
    new Date(article.createdDate) >= new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);

  const related = await fetchRelated(title);

  const counts = { like: 0, happy: 0, dislike: 0, sad: 0 };
  (article.like ?? []).forEach((l) => {
    counts[reactionNameFromType(l.type)]++;
  });
  const { like: likeCount, happy: happyCount, dislike: dislikeCount, sad: sadCount } = counts;
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL || 'https://www.90stimes.com';

  return (
    <div className={`${articleInter.variable} ${styles.newspaper}`}>
      <Script id="ld-news-article" type="application/ld+json" strategy="afterInteractive">
        {JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'NewsArticle',
          mainEntityOfPage: {
            '@type': 'WebPage',
            '@id': new URL(`/articles/${article.slug}`, siteUrl).toString(),
          },
          headline: article.title,
          datePublished: article.createdDate,
          dateModified: article.createdDate,
          author: { '@type': 'Organization', name: 'The Nineties Times' },
          publisher: {
            '@type': 'Organization',
            name: 'The Nineties Times',
            logo: { '@type': 'ImageObject', url: new URL('/favicon.ico', siteUrl).toString() },
          },
          image: (article.images || [])
            .map(img => img.photoLink)
            .filter(Boolean)
            .map(src => new URL(src as string, siteUrl).toString())
            .slice(0, 3),
          description: article.summary || stripHtml(article.content || '').slice(0, 160),
        })}
      </Script>
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
          {typeof article.views === 'number'
            ? ` | ${article.views.toLocaleString()} views`
            : ''}
        </p>
        {/* Text-to-Speech controls */}
        <ArticleTTS
          text={stripHtml(article.content || article.summary || '')}
          title={article.title}
          storageKey={article.id || article.slug}
        />

        {article.images && article.images.length > 0 && (
          <div className={article.images.length > 1 ? styles.gallery : undefined}>
            {article.images.map((img, idx) => {
              const base64 = img.photo ? `data:image/jpeg;base64,${img.photo}` : undefined;
              const link = img.photoLink ? toAbsoluteIfRelative(img.photoLink, siteUrl) : undefined;
              const src = link ?? base64;
              if (!src) return null;
              return (
                <figure key={idx} className={styles.figure}>
                  <Image
                    src={src}
                    alt={img.altText || article.title}
                    className={styles.image}
                    width={700}
                    height={400}
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 700px"
                    priority={idx === 0}
                    placeholder={base64 ? 'blur' : undefined}
                    blurDataURL={base64}
                    unoptimized={!!base64 || !!(link && !isValidImageForNextImage(link))}
                  />
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
          articleId={article.id}
          initialLikes={likeCount}
          initialHappy={happyCount}
          initialDislikes={dislikeCount}
          initialSad={sadCount}
        />
        <CommentsSection
          articleId={article.id}
          initialComments={article.comments ?? []}
        />
      </article>
      {related.length > 0 && (
        <aside className={styles.sidebar}>
          <h2 className={styles.relatedHeading}>Related Articles</h2>
          <div className={styles.relatedBar}>
            {related.map((a) => (
              <PrefetchLink key={a.slug} href={`/articles/${a.slug}`}>
                {a.title}
              </PrefetchLink>
            ))}
          </div>
          <LocalArticleSection />
        </aside>
      )}
      
    </div>
  );
}




