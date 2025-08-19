'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { API_ROUTES } from '@/lib/api';

export interface AdminInfo {
  id?: string;
  adminName?: string;
  email?: string;
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
    const controller = new AbortController();
    let isMounted = true;

    async function check() {
      try {
        const res = await fetch(API_ROUTES.ADMIN_AUTH.ME, {
          credentials: 'include',
          signal: controller.signal,
        });
        if (!res.ok) {
          router.replace('/admin-login');
          return;
        }
        const data: AdminInfo = await res.json();
        if (isMounted) {
          setAdmin(data);
        }
      } catch {
        if (!controller.signal.aborted) {
          router.replace('/admin-login');
        }
      }
    }

    check();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [router]);

  return admin;
}

