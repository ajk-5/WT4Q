import LoginClient from './LoginClient';

export const metadata = {
  title: 'Login',
  description: 'Sign in to your Nineties Times account',
};

type LoginSearchParams = { from?: string };

export default async function LoginPage({
  searchParams,
}: {
  searchParams?: Promise<LoginSearchParams>;
}) {
  const params = await searchParams;
  return <LoginClient from={params?.from} />;
}
