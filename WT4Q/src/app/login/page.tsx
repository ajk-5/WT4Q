import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import LoginClient from './LoginClient';

export const metadata = {
  title: 'Login',
  description: 'Sign in to your WT4Q account',
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams?: Promise<{ from?: string }>;
}) {
  const cookieStore = await cookies();
  if (cookieStore.get('JwtToken')) {
    redirect('/');
  }

  const params = await searchParams;
  return <LoginClient from={params?.from} />;
}
