import type { Metadata } from 'next';
import DashboardClient from './DashboardClient';
import { ensureAdmin } from '@/app/admin/ensureAdmin';

export const metadata: Metadata = {
  title: 'Admin Dashboard',
  description: 'Administrative dashboard',
  alternates: { canonical: '/admin/dashboard' },
  robots: { index: false, follow: false },
};

export default async function DashboardPage() {
  await ensureAdmin();
  return <DashboardClient />;
}
