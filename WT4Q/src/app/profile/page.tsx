import type { Metadata } from 'next';
import ProfileClient from './ProfileClient';

export const metadata: Metadata = {
  title: 'Your Profile',
  description: 'Manage your Nineties Times profile and account settings.',
  alternates: { canonical: '/profile' },
  robots: { index: false, follow: false },
};

export default function Profile() {
  return <ProfileClient />;
}
