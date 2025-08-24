"use client";
import { useEffect } from 'react';
import { API_BASE_URL, apiFetch } from '@/lib/api';

export default function PageVisitLogger({ page }: { page: string }) {
  useEffect(() => {
    apiFetch(`${API_BASE_URL}/api/VisitLog/page-visit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pageUrl: page }),
    }).catch(() => {});
  }, [page]);

  return null;
}
