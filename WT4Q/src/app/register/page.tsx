import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import RegisterClient from './RegisterClient';

export const metadata = {
  title: 'Register',
  description: 'Create a new WT4Q account',
};

export default async function RegisterPage() {
  const cookieStore = await cookies();
  if (cookieStore.get('JwtToken')) {
    redirect('/');
  }
  return <RegisterClient />;
}
