// Data courtesy of Open-Meteo (https://open-meteo.com/)
import WeatherIcon from '@/components/WeatherIcon';
import { WORLD_CITIES, WorldCity } from '@/lib/worldCities';
import styles from './WorldClock.module.css';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'World Clock – Global Time & Weather',
  description: 'Current local time and weather for 100 major cities around the world.',
  keywords: ['world clock', 'global time', 'weather', 'cities', 'tools'],
};

interface CityWeather extends WorldCity {
  time: string;
  temperature: number;
  weathercode: number;
  is_day: number;
}

async function fetchCity(city: WorldCity): Promise<CityWeather> {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${city.lat}&longitude=${city.lon}&current_weather=true&timezone=${encodeURIComponent(city.timezone)}`;
  const res = await fetch(url, { next: { revalidate: 300 } });
  const data = await res.json();
  const now = new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: city.timezone,
  }).format(new Date());
  return {
    ...city,
    time: now,
    temperature: data.current_weather?.temperature ?? 0,
    weathercode: data.current_weather?.weathercode ?? 0,
    is_day: data.current_weather?.is_day ?? 1,
  };
}

export default async function WorldClockPage() {
  const cities = await Promise.all(WORLD_CITIES.map(fetchCity));
  return (
    <main className={styles.container}>
      <h1>World Clock</h1>
      <div className={styles.grid}>
        {cities.map((c) => (
          <div key={c.name} className={styles.card}>
            <h2 className={styles.city}>{c.name}</h2>
            <div className={styles.time}>{c.time}</div>
            <div className={styles.weather}>
              <WeatherIcon code={c.weathercode} isDay={c.is_day === 1} className={styles.icon} />
              <span>{Math.round(c.temperature)}&deg;C</span>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
