import DashboardClient from './DashboardClient';
import { ensureAdmin } from '@/app/admin/ensureAdmin';

export default async function DashboardPage() {
  await ensureAdmin();
  return <DashboardClient />;
}
