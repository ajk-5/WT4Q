import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { API_ROUTES } from '@/lib/api';
import AdminRegisterClient from './AdminRegisterClient';

export default async function AdminRegisterPage() {
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
    const isSuperAdmin =
      admin?.role === 'SuperAdmin' ||
      admin?.roles?.includes?.('SuperAdmin');
    if (!isSuperAdmin) {
      redirect('/admin-login');
    }
  } catch {
    redirect('/admin-login');
  }
  return <AdminRegisterClient />;
}
