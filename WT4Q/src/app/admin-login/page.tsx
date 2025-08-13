import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import AdminLoginClient from './AdminLoginClient';
import { API_ROUTES } from '@/lib/api';
import type { AdminInfo } from '@/hooks/useAdminGuard';

const ALLOWED_ROLES = ['admin', 'superadmin'];

export default async function AdminLoginPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get('JwtToken');

  if (token) {
    try {
      const res = await fetch(API_ROUTES.ADMIN_AUTH.ME, {
        headers: { Cookie: `JwtToken=${token.value}` },
        cache: 'no-store',
      });
      if (res.ok) {
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

        if (roles.some((r) => ALLOWED_ROLES.includes(r))) {
          redirect('/admin/dashboard');
        }
      }
    } catch {
      // ignore errors and show login
    }
  }

  return <AdminLoginClient />;
}
