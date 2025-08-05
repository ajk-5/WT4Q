import WeatherClient from './WeatherClient';

export const metadata = {
  title: 'Weather',
  description: 'Check current weather and forecasts',
};

export default function WeatherPage() {
  return <WeatherClient />;
}
