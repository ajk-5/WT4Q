import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { API_ROUTES } from '@/lib/api';
import type { AdminInfo } from '@/hooks/useAdminGuard';

export async function ensureAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get('JwtToken');
  if (!token) {
    redirect('/admin-login');
  }

  try {
    const res = await fetch(API_ROUTES.ADMIN_AUTH.ME, {
      headers: {
        Cookie: `JwtToken=${token.value}`,
      },
      cache: 'no-store',
      credentials: 'include',
    });

    if (!res.ok) {
      redirect('/admin-login');
    }

    const data: AdminInfo = await res.json();
    return data;
  } catch {
    redirect('/admin-login');
  }
}
