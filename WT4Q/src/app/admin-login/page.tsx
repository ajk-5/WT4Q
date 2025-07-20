import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import AdminLoginClient from './AdminLoginClient';

export default async function AdminLoginPage() {
  const cookieStore = await cookies();
  if (cookieStore.get('AdminToken')) {
    redirect('/admin/dashboard');
  }
  return <AdminLoginClient />;
}
