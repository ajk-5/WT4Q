import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import CocktailDashboardClient from './CocktailDashboardClient';

export default async function CocktailDashboardPage() {
  const cookieStore = await cookies();
  if (!cookieStore.get('JwtToken')) {
    redirect('/admin-login');
  }
  return <CocktailDashboardClient />;
}
