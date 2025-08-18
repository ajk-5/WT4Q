import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import AdminLoginClient from './AdminLoginClient';
import { API_ROUTES } from '@/lib/api';

export default async function AdminLoginPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get('JwtToken');

  if (token) {
    try {
      const res = await fetch(API_ROUTES.ADMIN_AUTH.ME, {
        headers: { Cookie: `JwtToken=${token.value}` },
        cache: 'no-store',
        credentials: 'include',
      });
      if (res.ok) {
        // A 200 response implies the user is an admin due to server-side policy
        redirect('/admin/dashboard');
      }
    } catch {
      // ignore errors and show login
    }
  }

  return <AdminLoginClient />;
}
