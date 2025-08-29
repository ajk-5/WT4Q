import WeatherClient from '../WeatherClient';
import type { Metadata } from 'next';

export async function generateMetadata({ params }: { params: Promise<{ city: string }> }): Promise<Metadata> {
  const { city } = await params;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.90stimes.com';
  const url = `${siteUrl}/weather/${encodeURIComponent(city)}`;
  const title = `Weather in ${city} - The Nineties Times`;
  return {
    title,
    description: `Check current weather and forecasts for ${city}.`,
    alternates: { canonical: url },
    openGraph: {
      title,
      url,
      type: 'website',
    },
  };
}

export default async function WeatherByCityPage({ params }: { params: Promise<{ city: string }> }) {
  const { city } = await params;
  return <WeatherClient initialCity={city} />;
}
