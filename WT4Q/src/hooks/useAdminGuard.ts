'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { API_ROUTES } from '@/lib/api';

export interface AdminInfo {
  id?: string;
  adminName?: string;
  email?: string;
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
        setAdmin(data);
      } catch {
        router.replace('/admin-login');
      }
    }
    check();
  }, [router]);

  return admin;
}

