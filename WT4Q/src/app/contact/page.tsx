import type { Metadata } from 'next';
import ContactClient from './ContactClient';

export const metadata: Metadata = {
  title: 'Contact The Nineties Times Newsroom',
  description: "Send news tips, partnership ideas, or feedback to The Nineties Times (90sTimes) editorial team and newsroom support.",
  keywords: [
    'contact newsroom',
    'send news tip',
    'press inquiries 2025',
    'The Nineties Times contact',
    '90sTimes editorial team',
    'media partnerships',
    'customer support news site'
  ],
  alternates: { canonical: '/contact' },
  openGraph: {
    title: 'Contact The Nineties Times',
    description: 'Reach the 90sTimes newsroom with story tips, partnership requests, advertising questions, or feedback for our editors.',
    url: '/contact',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'Contact The Nineties Times',
    description: 'Message the independent 90sTimes newsroom for tips, partnerships, advertising, or reader support.',
  },
};

export default function ContactPage() {
  return <ContactClient />;
}
