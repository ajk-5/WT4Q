import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import EditArticleClient from './EditArticleClient';
import { API_ROUTES } from '@/lib/api';

export default async function EditArticlePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const cookieStore = await cookies();
  if (!cookieStore.get('JwtToken')) {
    redirect('/admin-login');
  }
  try {
    const res = await fetch(API_ROUTES.ADMIN_AUTH.ME, {
      headers: { Cookie: cookieStore.toString() },
      cache: 'no-store',
    });
    if (!res.ok) redirect('/admin-login');
    const admin = await res.json();
    const isAdmin =
      admin?.role === 'Admin' ||
      admin?.role === 'SuperAdmin' ||
      admin?.roles?.includes?.('Admin') ||
      admin?.roles?.includes?.('SuperAdmin');
    if (!isAdmin) redirect('/admin-login');
  } catch {
    redirect('/admin-login');
  }
  const { id } = await params;
  return <EditArticleClient id={id} />;
}
