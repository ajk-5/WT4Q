import LoginClient from './LoginClient';

export const metadata = {
  title: 'Login',
  description: 'Sign in to your WT4Q account',
};

export default function LoginPage({
  searchParams,
}: {
  searchParams?: { from?: string };
}) {
  return <LoginClient from={searchParams?.from} />;
}
