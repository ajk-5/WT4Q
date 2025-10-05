import type { Metadata } from 'next';
import RegisterClient from './RegisterClient';

export const metadata: Metadata = {
  title: 'Register',
  description: 'Create a new Nineties Times account',
  alternates: { canonical: '/register' },
  robots: { index: false, follow: false },
};

export default function RegisterPage() {
  return <RegisterClient />;
}
