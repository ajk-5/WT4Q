import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import LoginClient from './LoginClient';

export default async function LoginPage() {
  const cookieStore = await cookies();
  if (cookieStore.get('JwtToken')) {
    redirect('/');
  }
  return <LoginClient />;
}
