'use client';
import { ReactElement, useState } from 'react';
import WeatherIcon from '@/components/WeatherIcon';
import WindIcon from '@/components/WindIcon';
import styles from './weather.module.css';

interface Weather {
  city: string;
  country: string;
  temperature: number;
  weathercode: number;
  isDay: boolean;
  windspeed?: number | null;
}

interface ForecastEntry {
  time: string;
  temperature: number;
  windspeed: number | null;
  symbol: string | null;
}

function iconFromSymbol(symbol: string | null, className: string): ReactElement | null {
  if (!symbol) return null;
  const isDay = !symbol.includes('night');
  if (symbol.includes('clearsky')) return <WeatherIcon code={0} isDay={isDay} className={className} />;
  if (symbol.includes('partlycloudy'))
    return <WeatherIcon code={1} isDay={isDay} className={className} />;
  if (symbol.includes('cloudy')) return <WeatherIcon code={3} isDay={isDay} className={className} />;
  if (symbol.includes('rain')) return <WeatherIcon code={61} isDay={isDay} className={className} />;
  if (symbol.includes('snow')) return <WeatherIcon code={71} isDay={isDay} className={className} />;
  if (symbol.includes('fog')) return <WeatherIcon code={45} isDay={isDay} className={className} />;
  if (symbol.includes('thunder')) return <WeatherIcon code={95} isDay={isDay} className={className} />;
  return <WeatherIcon code={3} isDay={isDay} className={className} />;
}

export default function WeatherPage() {
  const [city, setCity] = useState('');
  const [weather, setWeather] = useState<Weather | null>(null);
  const [forecast, setForecast] = useState<ForecastEntry[]>([]);
  const [error, setError] = useState('');
  const [unit, setUnit] = useState<'C' | 'F'>('C');

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
        const fRes = await fetch(`/api/weather/forecast-by-city?city=${encodeURIComponent(trimmed)}`);
        if (fRes.ok) {
          const fData = await fRes.json();
          setForecast(Array.isArray(fData.forecast) ? fData.forecast : []);
        } else {
          setForecast([]);
        }
      } else {
        const data = await res.json().catch(() => null);
        setError(data?.message || 'Unable to fetch weather');
        setWeather(null);
        setForecast([]);
      }
    } catch {
      setError('Unable to fetch weather');
      setWeather(null);
      setForecast([]);
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
          <WeatherIcon
            code={weather.weathercode}
            isDay={weather.isDay}
            className={styles.icon}
          />
          <span>
            {Math.round(unit === 'C' ? weather.temperature : weather.temperature * 1.8 + 32)}
            &deg;{unit} - {weather.city}, {weather.country}
            {weather.windspeed != null && `, ${Math.round(weather.windspeed)} km/h`}
          </span>
          <button
            type="button"
            onClick={() => setUnit(unit === 'C' ? 'F' : 'C')}
            className={styles.button}
          >
            {unit === 'C' ? '°F' : '°C'}
          </button>
        </div>
      )}
      {forecast.length > 0 && (
        <div className={styles.forecast}>
          <h2 className={styles.subheading}>Next 24 Hours</h2>
          {forecast.map((f) => (
            <div key={f.time} className={styles.forecastItem}>
              <span className={styles.time}>{new Date(f.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              {iconFromSymbol(f.symbol, styles.icon)}
              <span>
                {Math.round(unit === 'C' ? f.temperature : f.temperature * 1.8 + 32)}°{unit}
              </span>
              {f.windspeed != null && (
                <span className={styles.wind}>
                  <WindIcon className={styles.windIcon} />
                  {Math.round(f.windspeed)} km/h
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
