import { NextResponse } from 'next/server';
import { getDailyHoroscope } from '@/services/astrology';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  const horoscope = await getDailyHoroscope();
  return NextResponse.json(horoscope, {
    headers: {
      'Cache-Control': 'no-store, max-age=0',
    },
  });
}
