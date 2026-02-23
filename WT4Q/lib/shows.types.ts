export type ShowKind = 'TV' | 'Film' | 'Music' | 'Game' | 'Other';

export type ShowTrivia = {
  id: string;
  text: string;
  imageUrl?: string;
  createdAt?: string;
};

export type Show = {
  slug: string;
  title: string;
  kind: ShowKind;
  description?: string;
  // Original author-supplied URL or upload path (may point to /uploads or external host)
  imageUrl?: string;
  // Stable, DB-backed image URL (served from /api/Show/{slug}/image when available)
  stableImageUrl?: string;
  imageAltText?: string;
  imageCaption?: string;
  yearStart?: number;
  yearEnd?: number;
  tags?: string[];
  trivias?: ShowTrivia[];
  createdAt?: string;
  quizzes?: Array<{
    slug: string;
    title: string;
    type: string;
    description?: string;
    imageUrl?: string;
    createdAt?: string;
  }>;
};
