import type { Metadata } from 'next';
import ForgotPasswordClient from './ForgotPasswordClient';

export const metadata: Metadata = {
  title: 'Forgot Password',
  description: 'Reset your Nineties Times account password.',
  alternates: { canonical: '/forgot-password' },
  robots: { index: false, follow: false },
};

export default function Page() {
  return <ForgotPasswordClient />;
}

