'use client';
import { useEffect, useState } from 'react';
import WeatherIcon from './WeatherIcon';
import styles from './WeatherWidget.module.css';
import { API_ROUTES } from '@/lib/api';

interface Weather {
  temperature: number;
  weathercode: number;
  isDay: boolean;
  windspeed?: number | null;
}

interface Location {
  city: string;
  country: string;
}

export default function WeatherWidget() {
  const [weather, setWeather] = useState<Weather | null>(null);
  const [location, setLocation] = useState<Location | null>(null);
  const [unit, setUnit] = useState<'C' | 'F'>('C');

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

  const refresh = () => {
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

  if (!weather) return null;

  return (
    <div className={styles.weather} aria-label="Current weather">
      <WeatherIcon
        code={weather.weathercode}
        isDay={weather.isDay}
        className={styles.icon}
      />
      <span className={styles.temp}>
        {Math.round(unit === 'C' ? weather.temperature : weather.temperature * 1.8 + 32)}&deg;{unit}
        <button className={styles.button} onClick={() => setUnit(unit === 'C' ? 'F' : 'C')} aria-label="Toggle units">
          {unit === 'C' ? '°F' : '°C'}
        </button>
      </span>
      {weather.windspeed != null && (
        <span className={styles.location}>{Math.round(weather.windspeed)} km/h</span>
      )}
      {location && (
        <span className={styles.location}>
          {location.city}, {location.country}
        </span>
      )}
      <button className={styles.button} onClick={refresh} aria-label="Refresh weather">↻</button>
    </div>
  );
}

