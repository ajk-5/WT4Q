import { Metadata } from 'next';
import TypingPracticeClient from './TypingPracticeClient';
import { API_ROUTES } from '@/lib/api';
import { stripHtml } from '@/lib/text';

export const metadata: Metadata = {
  title: 'Typing Practice',
  description:
    'Practice typing online using the latest technology article. Typing test1, practice typing test, typing online practice81, typing online, practice typing online, typing master.',
  keywords: [
    'typing test1',
    'practice typing test',
    'typing online practice81',
    'typing online',
    'practice typing online',
    'typing master',
  ],
};

interface Article {
  createdDate?: string;
  content?: string;
  summary?: string;
}

async function fetchLatestTechText(): Promise<string> {
  try {
    const res = await fetch(
      `${API_ROUTES.ARTICLE.SEARCH_ADVANCED}?category=Technology`,
      {
        cache: 'no-store',
      },
    );
    if (!res.ok) return 'Welcome to typing practice';
    const articles: Article[] = await res.json();
    const latest = articles
      .sort(
        (a, b) =>
          new Date(b.createdDate ?? 0).getTime() -
          new Date(a.createdDate ?? 0).getTime(),
      )[0];
    const text = stripHtml(latest?.content || latest?.summary || '');
    return (
      text.replace(/\s+/g, ' ').trim().slice(0, 2000) ||
      'Welcome to typing practice'
    );
  } catch {
    return 'Welcome to typing practice';
  }
}

export default async function TypingPracticePage() {
  const text = await fetchLatestTechText();
  return <TypingPracticeClient initialText={text} />;
}
