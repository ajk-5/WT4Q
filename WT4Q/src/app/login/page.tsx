import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import LoginClient from './LoginClient';

export const metadata = {
  title: 'Login',
  description: 'Sign in to your WT4Q account',
};

export default async function LoginPage() {
  const cookieStore = await cookies();
  if (cookieStore.get('JwtToken')) {
    redirect('/');
  }
  return <LoginClient />;
}
