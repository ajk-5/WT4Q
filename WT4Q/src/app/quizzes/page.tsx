import { redirect } from 'next/navigation';
import { VAULT_BASE } from '@/lib/vaultPaths';

export default function QuizzesPage() {
  redirect(`${VAULT_BASE}#editor-quizzes`);
}
