import EditArticleClient from './EditArticleClient';
import { ensureAdmin } from '@/app/admin/ensureAdmin';

export default async function EditArticlePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await ensureAdmin();
  const { id } = await params;
  return <EditArticleClient id={id} />;
}
