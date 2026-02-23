import type { Metadata } from 'next';
import ContactClient from './ContactClient';

export const metadata: Metadata = {
  title: 'Contact The Nineties Times',
  description: 'Send feedback, partnership ideas, or community notes to The Nineties Times (90sTimes) team.',
  keywords: [
    'contact 90sTimes',
    'community feedback',
    'partnership inquiries',
    'The Nineties Times contact',
    '90sTimes team',
    'nostalgia community'
  ],
  alternates: { canonical: '/contact' },
  openGraph: {
    title: 'Contact The Nineties Times',
    description: 'Reach the 90sTimes team with feedback, partnership requests, or community ideas.',
    url: '/contact',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'Contact The Nineties Times',
    description: 'Message the 90sTimes team for feedback, partnerships, or reader support.',
  },
};

export default function ContactPage() {
  return <ContactClient />;
}
