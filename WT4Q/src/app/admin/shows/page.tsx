import { ensureAdmin } from '@/app/admin/ensureAdmin';
import ShowAdminClient from './show-admin-client';

export const dynamic = 'force-dynamic';

export default async function AdminShowsPage() {
  await ensureAdmin();
  return <ShowAdminClient />;
}
