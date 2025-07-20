import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import DashboardClient from './DashboardClient';

export default async function DashboardPage() {
  const cookieStore = await cookies();
  if (!cookieStore.get('AdminToken')) {
    redirect('/admin-login');
  }
  return <DashboardClient />;
}
