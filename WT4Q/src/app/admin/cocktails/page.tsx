import CocktailDashboardClient from './CocktailDashboardClient';
import { ensureAdmin } from '@/app/admin/ensureAdmin';

export default async function CocktailDashboardPage() {
  await ensureAdmin();
  return <CocktailDashboardClient />;
}
