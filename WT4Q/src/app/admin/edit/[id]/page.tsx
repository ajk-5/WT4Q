import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import EditArticleClient from './EditArticleClient';

export default async function EditArticlePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const cookieStore = await cookies();
  if (!cookieStore.get('AdminToken')) {
    redirect('/admin-login');
  }
  const { id } = await params;
  return <EditArticleClient id={id} />;
}
