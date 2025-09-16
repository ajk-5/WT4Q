import type { Metadata } from 'next';
import { getDailyHoroscope } from '@/services/astrology';
import AstrologyClient from './AstrologyClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata: Metadata = {
  title: 'Daily Astrology Horoscope | The Nineties Times',
  description:
    'Personalised daily astrology from The Nineties Times. Explore Gemini-powered guidance for every zodiac sign, relationship tips, rituals, stones, and celestial influences, refreshed at midnight GMT.',
  keywords: [
    'daily horoscope',
    'astrology forecast',
    'zodiac compatibility',
    'horoscope email subscription',
    'gemini ai horoscope',
    'the nineties times astrology',
  ],
};

export default async function AstrologyPage() {
  const horoscope = await getDailyHoroscope();
  return <AstrologyClient initialHoroscope={horoscope} />;
}
