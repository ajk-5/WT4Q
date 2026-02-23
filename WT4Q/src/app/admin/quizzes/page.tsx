import { ensureAdmin } from '@/app/admin/ensureAdmin';
import QuizAdminClient from './QuizAdminClient';

export const dynamic = 'force-dynamic';

export default async function AdminQuizzesPage() {
  await ensureAdmin();
  return <QuizAdminClient />;
}
