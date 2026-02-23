import { redirect } from 'next/navigation';

export default function LegacyQuizAdminRedirect() {
  redirect('/admin/quizzes');
}
