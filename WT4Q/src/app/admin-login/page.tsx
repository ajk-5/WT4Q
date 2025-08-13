import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import AdminLoginClient from './AdminLoginClient';
import { API_ROUTES } from '@/lib/api';

export default async function AdminLoginPage() {
  const cookieStore = await cookies();
  if (cookieStore.get('JwtToken')) {
    try {
      const res = await fetch(API_ROUTES.ADMIN_AUTH.ME, {
        headers: { Cookie: cookieStore.toString() },
        cache: 'no-store',
      });
      if (res.ok) {
        const admin = await res.json();
        const isAdmin =
          admin?.role === 'Admin' ||
          admin?.role === 'SuperAdmin' ||
          admin?.roles?.includes?.('Admin') ||
          admin?.roles?.includes?.('SuperAdmin');
        if (isAdmin) {
          redirect('/admin/dashboard');
        }
      }
    } catch {
      // ignore
    }
  }
  return <AdminLoginClient />;
}
