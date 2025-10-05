import type { Metadata } from 'next';
import LoginClient from './LoginClient';

export const metadata: Metadata = {
  title: 'Login',
  description: 'Sign in to your Nineties Times account',
  alternates: { canonical: '/login' },
  robots: { index: false, follow: false },
};

type LoginSearchParams = { from?: string };

export default async function LoginPage({
  searchParams,
}: {
  searchParams?: Promise<LoginSearchParams>;
}) {
  const params = await searchParams;
  return <LoginClient from={params?.from}/>;
}
