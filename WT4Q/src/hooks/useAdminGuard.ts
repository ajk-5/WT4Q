'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { API_ROUTES } from '@/lib/api';

const ALLOWED_ROLES = ['admin', 'superadmin'];

export interface AdminInfo {
  id?: string;
  role?: string;
  roles?: string[];
  isAdmin?: boolean;
  isSuperAdmin?: boolean;
  [key: string]: unknown;
}

export function useAdminGuard() {
  const router = useRouter();
  const [admin, setAdmin] = useState<AdminInfo | null>(null);

  useEffect(() => {
    async function check() {
      try {
        const res = await fetch(API_ROUTES.ADMIN_AUTH.ME, {
          credentials: 'include',
        });
        if (!res.ok) {
          router.replace('/admin-login');
          return;
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
          router.replace('/admin-login');
          return;
        }

        setAdmin(data);
      } catch {
        router.replace('/admin-login');
      }
    }
    check();
  }, [router]);

  return admin;
}

