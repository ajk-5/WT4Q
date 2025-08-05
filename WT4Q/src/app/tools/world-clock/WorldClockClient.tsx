'use client';

import { useEffect, useMemo, useState } from 'react';
import WeatherIcon from '@/components/WeatherIcon';
import styles from './WorldClock.module.css';
import type { CityWeather } from './page';

interface Props {
  cities: CityWeather[];
}

export default function WorldClockClient({ cities }: Props) {
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState(search);

  useEffect(() => {
    const handler = setTimeout(() => setDebounced(search), 300);
    return () => clearTimeout(handler);
  }, [search]);

  const filtered = useMemo(() => {
    const lower = debounced.toLowerCase();
    return cities.filter((c) => c.name.toLowerCase().includes(lower));
  }, [cities, debounced]);

  return (
    <main className={styles.container}>
      <h1>World Clock</h1>
      <input
        type="text"
        placeholder="Search cities"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className={styles.search}
      />
      <div className={styles.grid}>
        {filtered.map((c) => (
          <div key={c.name} className={styles.card}>
            <h2 className={styles.city}>{c.name}</h2>
            <div className={styles.time}>{c.time}</div>
            <div className={styles.weather}>
              <WeatherIcon code={c.weathercode} isDay={c.is_day === 1} className={styles.icon} />
              <span>{Math.round(c.temperature)}°C</span>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}

