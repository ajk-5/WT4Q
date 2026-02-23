import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import QuizPage, { generateMetadata as generateQuizMetadata } from '../../born-in-the-90s/[slug]/page';
import { generateShowMetadata, renderShowPage } from '../../born-in-the-90s/_showPage';

type Params = Promise<{ segments?: string[] }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { segments = [] } = await params;

  if (segments.length === 1) {
    return generateQuizMetadata({ params: Promise.resolve({ slug: segments[0] }) });
  }

  if (segments.length === 2) {
    return generateShowMetadata(segments[1]);
  }

  return {};
}

export default async function Page({ params }: { params: Params }) {
  const { segments = [] } = await params;

  if (segments.length === 1) {
    return QuizPage({ params: Promise.resolve({ slug: segments[0] }) });
  }

  if (segments.length === 2) {
    const view = await renderShowPage(segments[1]);
    if (!view) notFound();
    return view;
  }

  notFound();
}
