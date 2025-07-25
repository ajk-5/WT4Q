'use client';
import { useEffect, useState } from 'react';
import WeatherIcon from './WeatherIcon';
import styles from './WeatherWidget.module.css';
import { API_ROUTES } from '@/lib/api';

interface Weather {
  temperature: number;
  weathercode: number;
}

interface Location {
  city: string;
  country: string;
}

export default function WeatherWidget() {
  const [weather, setWeather] = useState<Weather | null>(null);
  const [location, setLocation] = useState<Location | null>(null);

  useEffect(() => {
    const fetchData = () => {
      fetch(API_ROUTES.WEATHER.CURRENT)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data) setWeather(data);
        })
        .catch(() => {});

      fetch(API_ROUTES.USER_LOCATION.GET)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data && data.city && data.country) {
            setLocation({ city: data.city, country: data.country });
          }
        })
        .catch(() => {});
    };

    fetchData();
    const id = setInterval(fetchData, 10 * 60 * 1000);
    return () => clearInterval(id);
  }, []);

  if (!weather) return null;

  return (
    <div className={styles.weather} aria-label="Current weather">
      <WeatherIcon code={weather.weathercode} className={styles.icon} />
      <span>{Math.round(weather.temperature)}&deg;C</span>
      {location && (
        <span className={styles.location}>
          {location.city}, {location.country}
        </span>
      )}
    </div>
  );
}

