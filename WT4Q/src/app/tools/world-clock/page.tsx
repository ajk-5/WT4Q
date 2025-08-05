"use client";

// Data courtesy of Open-Meteo (https://open-meteo.com/)

import { useEffect, useState } from 'react';
import WeatherIcon from '@/components/WeatherIcon';

import { WORLD_CITIES, WorldCity } from '@/lib/worldCities';
import { Metadata } from 'next';
import WorldClockClient from './WorldClockClient';

export const metadata: Metadata = {
  title: 'World Clock – Global Time & Weather',
  description: 'Current local time and weather for 100 major cities around the world.',
  keywords: ['world clock', 'global time', 'weather', 'cities', 'tools'],
};

export interface CityWeather extends WorldCity {
  time: string;
  temperature: number;
  weathercode: number;
  is_day: number;
}

async function fetchCity(city: WorldCity): Promise<CityWeather> {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${city.lat}&longitude=${city.lon}&current_weather=true&timezone=${encodeURIComponent(city.timezone)}`;
  const res = await fetch(url);
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


export default function WorldClockPage() {
  const [cities, setCities] = useState<CityWeather[]>([]);

  useEffect(() => {
    async function loadCities() {
      const cityData = await Promise.all(WORLD_CITIES.map(fetchCity));
      setCities(cityData);
    }
    loadCities();
  }, []);

  useEffect(() => {
    const updateTimes = () => {
      setCities((prev) =>
        prev.map((c) => ({
          ...c,
          time: new Intl.DateTimeFormat('en-GB', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
            timeZone: c.timezone,
          }).format(new Date()),
        }))
      );
    };
    const interval = setInterval(updateTimes, 60000);
    updateTimes();
    return () => clearInterval(interval);
  }, []);


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
