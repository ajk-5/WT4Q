import { generateShowMetadata, renderShowPage } from '../../_showPage';

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }) {
  const { slug } = await params;
  return generateShowMetadata(slug);
}

export default async function Page({ params }: { params: Params }) {
  const { slug } = await params;
  return renderShowPage(slug);
}

