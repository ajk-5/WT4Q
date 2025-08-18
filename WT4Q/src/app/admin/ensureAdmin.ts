import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { API_ROUTES } from '@/lib/api';
import type { AdminInfo } from '@/hooks/useAdminGuard';

const ALLOWED_ROLES = ['admin', 'superadmin'];

export async function ensureAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get('JwtToken');
  if (!token) {
    redirect('/admin-login');
  }

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
  const roles: string[] = [];
  if (typeof data.role === 'string') {
    roles.push(data.role.toLowerCase());
  }
  if (Array.isArray(data.roles)) {
    data.roles.forEach((r) => roles.push(r.toLowerCase()));
  }
  if (data.isAdmin) roles.push('admin');
  if (data.isSuperAdmin) roles.push('superadmin');

  if (!roles.some((r) => ALLOWED_ROLES.includes(r))) {
    redirect('/admin-login');
  }

  return data;
}
