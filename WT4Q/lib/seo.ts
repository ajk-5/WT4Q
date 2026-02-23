import type { Metadata } from 'next';

const rawSiteUrl = (process.env.NEXT_PUBLIC_SITE_URL || '').trim();
export const SITE_URL = rawSiteUrl && /^https?:\/\//i.test(rawSiteUrl)
  ? rawSiteUrl
  : 'https://www.90stimes.com';

export const SITE_NAME = 'The Nineties Times';
export const SITE_DESCRIPTION = 'Independent, reliable, in-depth news, summarized.';

export const DEFAULT_OG_IMAGE = `${SITE_URL}/images/90stimeslogo.png.jpg`;

export function absoluteUrl(path = '/'): string {
  try {
    // Allow callers to pass either a path or a full URL
    const input = path.startsWith('http://') || path.startsWith('https://') ? path : path.startsWith('/')
      ? `${SITE_URL}${path}`
      : `${SITE_URL}/${path}`;
    return new URL(input).toString();
  } catch {
    return SITE_URL;
  }
}

export const robotsDirectives: NonNullable<Metadata['robots']> = {
  index: true,
  follow: true,
  googleBot: {
    index: true,
    follow: true,
    'max-snippet': -1,
    'max-image-preview': 'large',
    'max-video-preview': -1,
  },
};

export const defaultOpenGraph: NonNullable<Metadata['openGraph']> = {
  type: 'website',
  siteName: SITE_NAME,
  title: SITE_NAME,
  description: SITE_DESCRIPTION,
  url: SITE_URL,
  images: [
    {
      url: DEFAULT_OG_IMAGE,
      width: 1200,
      height: 630,
      alt: `${SITE_NAME} logo`,
    },
  ],
};

export function canonicalFor(path = '/'): string {
  return absoluteUrl(path);
}
