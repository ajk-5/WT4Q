'use client';
import { useState } from 'react';
import WeatherIcon from '@/components/WeatherIcon';
import styles from './weather.module.css';

interface Weather {
  city: string;
  country: string;
  temperature: number;
  weathercode: number;
}

export default function WeatherPage() {
  const [city, setCity] = useState('');
  const [weather, setWeather] = useState<Weather | null>(null);
  const [error, setError] = useState('');

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = city.trim();
    if (!trimmed) return;
    try {
      setError('');
      const res = await fetch(`/api/weather/by-city?city=${encodeURIComponent(trimmed)}`);
      if (res.ok) {
        const data: Weather = await res.json();
        setWeather(data);
      } else {
        const data = await res.json().catch(() => null);
        setError(data?.message || 'Unable to fetch weather');
        setWeather(null);
      }
    } catch {
      setError('Unable to fetch weather');
      setWeather(null);
    }
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.heading}>Weather Search</h1>
      <form onSubmit={handleSearch} className={styles.form}>
        <input
          type="text"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          placeholder="Enter city name"
          className={styles.input}
        />
        <button type="submit" className={styles.button}>Search</button>
      </form>
      {error && <p className={styles.error}>{error}</p>}
      {weather && (
        <div className={styles.result}>
          <WeatherIcon code={weather.weathercode} className={styles.icon} />
          <span>
            {Math.round(weather.temperature)}&deg;C - {weather.city}, {weather.country}
          </span>
        </div>
      )}
    </div>
  );
}
