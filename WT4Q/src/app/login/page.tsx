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
  const params = await searchParams;
  return <LoginClient from={params?.from} />;
}
