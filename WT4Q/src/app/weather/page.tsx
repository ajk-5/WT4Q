import WeatherClient from './WeatherClient';

export const metadata = {
  title: 'The Nineties Times Weather: Live Forecasts & Real-Time Weather Updates',
  description:
    'Get today’s weather, hourly and 7-day forecasts, real-time radar, air quality index, UV index, and severe weather alerts for cities worldwide.',
  keywords: [
    'today’s weather',
    'hourly forecast',
    '7-day weather',
    'real-time radar',
    'air quality index',
    'UV index today',
    'live weather updates',
    'worldwide city forecasts',
    'hurricane tracker',
    'extreme weather alerts'
  ],
};

export default function WeatherPage() {
  return <WeatherClient />;
}
