'use client';
import { ReactElement, useState, useEffect } from 'react';
import Link from 'next/link';
import WeatherIcon from '@/components/WeatherIcon';
import WindIcon from '@/components/WindIcon';
import styles from './weather.module.css';

interface Weather {
  city: string;
  country: string;
  latitude: number;
  longitude: number;
  temperature: number;
  weathercode: number;
  isDay: boolean;
  windspeed?: number | null;
  airQuality?: number | null;
  uvIndex?: number | null;
  alerts: string[];
}

interface ForecastEntry {
  time: string;
  temperature: number;
  windspeed: number | null;
  symbol: string | null;
}

interface DailyForecast {
  date: string;
  weathercode: number;
  max: number;
  min: number;
}

interface SavedCity extends Weather {
  forecast: DailyForecast[];
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

export default function WeatherPage({ initialCity }: { initialCity?: string }) {
  const [city, setCity] = useState(initialCity || '');
  const [weather, setWeather] = useState<Weather | null>(null);
  const [forecast, setForecast] = useState<ForecastEntry[]>([]);
  const [error, setError] = useState('');
  const [unit, setUnit] = useState<'C' | 'F'>('C');
  const [saved, setSaved] = useState<SavedCity[]>([]);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    try {
      const raw = JSON.parse(localStorage.getItem('savedCities') || '[]');
      if (Array.isArray(raw)) {
        if (raw.length > 0 && typeof raw[0] === 'string') {
          Promise.all(
            (raw as string[]).map(async (c) => {
              const wRes = await fetch(`/api/weather/by-city?city=${encodeURIComponent(c)}`);
              const fRes = await fetch(
                `/api/weather/daily-forecast-by-city?city=${encodeURIComponent(c)}`
              );
              if (wRes.ok && fRes.ok) {
                const wData = await wRes.json();
                const fData = await fRes.json();
                return {
                  ...wData,
                  alerts: Array.isArray(wData.alerts) ? wData.alerts : [],
                  forecast: Array.isArray(fData.forecast) ? fData.forecast : [],
                } as SavedCity;
              }
              return null;
            })
          ).then((list) => {
            const filtered = list.filter(Boolean) as SavedCity[];
            setSaved(filtered);
            localStorage.setItem('savedCities', JSON.stringify(filtered));
          });
        } else {
          setSaved(raw as SavedCity[]);
        }
      }
    } catch {
      setSaved([]);
    }
  }, []);

  const saveCurrentCity = async () => {
    if (!weather) return;
    const stored = JSON.parse(localStorage.getItem('savedCities') || '[]') as SavedCity[];
    if (stored.some((c) => c.city === weather.city)) return;
    const fRes = await fetch(
      `/api/weather/daily-forecast-by-city?city=${encodeURIComponent(weather.city)}`
    );
    const fData = fRes.ok ? await fRes.json() : { forecast: [] };
    const newCity: SavedCity = {
      ...weather,
      forecast: Array.isArray(fData.forecast) ? fData.forecast : [],
    };
    const updated = [...stored, newCity];
    localStorage.setItem('savedCities', JSON.stringify(updated));
    setSaved(updated);
    setNotice('City saved');
    setTimeout(() => setNotice(''), 3000);
  };

  const removeCity = (name: string) => {
    const stored = JSON.parse(localStorage.getItem('savedCities') || '[]') as SavedCity[];
    const updated = stored.filter((w) => w.city !== name);
    localStorage.setItem('savedCities', JSON.stringify(updated));
    setSaved(updated);
  };

  const loadCity = async (name: string) => {
    try {
      setError('');
      const res = await fetch(`/api/weather/by-city?city=${encodeURIComponent(name)}`);
      if (res.ok) {
        const data: Weather = await res.json();
        setWeather({ ...data, alerts: Array.isArray(data.alerts) ? data.alerts : [] });
        const fRes = await fetch(
          `/api/weather/forecast-by-city?city=${encodeURIComponent(name)}`
        );
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

  const loadByCoords = async (lat: number, lon: number) => {
    try {
      setError('');
      const res = await fetch(`/api/weather/by-coordinates?lat=${lat}&lon=${lon}`);
      if (res.ok) {
        const data: Weather = await res.json();
        setWeather({ ...data, alerts: Array.isArray(data.alerts) ? data.alerts : [] });
        setCity(data.city || '');
        const fRes = await fetch(
          `/api/weather/forecast-by-coordinates?lat=${lat}&lon=${lon}`
        );
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

  useEffect(() => {
    if (initialCity) {
      setCity(initialCity);
      void loadCity(initialCity);
    }
  }, [initialCity]);

  // Auto-detect user location for weather/forecast if no initial city
  useEffect(() => {
    if (initialCity) return;
    if (typeof navigator === 'undefined' || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        void loadByCoords(latitude, longitude);
      },
      () => {
        // user denied or unavailable; user can still search manually
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }, [initialCity]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = city.trim();
    if (!trimmed) return;
    await loadCity(trimmed);
  };

  const openSavedCity = (name: string) => {
    setCity(name);
    void loadCity(name);
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
      {notice && <p className={styles.notice}>{notice}</p>}
      {weather && (
        <>
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
          <div className={styles.extra}>
            {(() => {
              const aqi = weather.airQuality;
              const category =
                aqi == null
                  ? 'unknown'
                  : aqi <= 50
                  ? 'good'
                  : aqi <= 100
                  ? 'moderate'
                  : 'unhealthy';
              const badgeClass =
                category === 'good'
                  ? styles.aqiGood
                  : category === 'moderate'
                  ? styles.aqiModerate
                  : category === 'unhealthy'
                  ? styles.aqiUnhealthy
                  : styles.aqiUnknown;
              const label =
                category === 'good'
                  ? 'Good'
                  : category === 'moderate'
                  ? 'Moderate'
                  : category === 'unhealthy'
                  ? 'Unhealthy'
                  : 'N/A';
              return (
                <div className={styles.aqiRow}>
                  <div className={`${styles.aqiBadge} ${badgeClass}`} aria-label={`AQI ${label}`}>
                    <Link
                      className={styles.aqiInfo}
                      href="/weather/air-quality"
                      aria-label="World Air Quality (internal)"
                      title="World Air Quality (internal)"
                    >
                      i
                    </Link>
                  </div>
                  <span className={styles.aqiText}>AQI: {aqi ?? 'N/A'} {aqi != null && `(${label})`}</span>
                </div>
              );
            })()}
            {(() => {
              const uv = weather.uvIndex;
              const category =
                uv == null
                  ? 'unknown'
                  : uv <= 2
                  ? 'low'
                  : uv <= 5
                  ? 'moderate'
                  : uv <= 7
                  ? 'high'
                  : uv <= 10
                  ? 'veryhigh'
                  : 'extreme';
              const badgeClass =
                category === 'low'
                  ? styles.uvLow
                  : category === 'moderate'
                  ? styles.uvModerate
                  : category === 'high'
                  ? styles.uvHigh
                  : category === 'veryhigh'
                  ? styles.uvVeryHigh
                  : category === 'extreme'
                  ? styles.uvExtreme
                  : styles.uvUnknown;
              const label =
                category === 'low'
                  ? 'Low'
                  : category === 'moderate'
                  ? 'Moderate'
                  : category === 'high'
                  ? 'High'
                  : category === 'veryhigh'
                  ? 'Very High'
                  : category === 'extreme'
                  ? 'Extreme'
                  : 'N/A';
              return (
                <div className={styles.uvRow}>
                  <div className={`${styles.aqiBadge} ${badgeClass}`} aria-label={`UV ${label}`}>
                    <Link
                      className={styles.aqiInfo}
                      href="/weather/uv-index"
                      aria-label="World UV Index (internal)"
                      title="World UV Index (internal)"
                    >
                      i
                    </Link>
                  </div>
                  <span className={styles.uvText}>UV Index: {uv ?? 'N/A'} {uv != null && `(${label})`}</span>
                </div>
              );
            })()}
            {weather.alerts.length > 0 && (
              <ul className={styles.alerts}>
                {weather.alerts.map((a) => (
                  <li key={a}>{a}</li>
                ))}
              </ul>
            )}
          </div>
          <div className={styles.mapContainer}>
            <iframe
              className={styles.map}
              src={`https://www.openstreetmap.org/export/embed.html?bbox=${weather.longitude - 0.05},${weather.latitude - 0.05},${weather.longitude + 0.05},${weather.latitude + 0.05}&layer=mapnik&marker=${weather.latitude},${weather.longitude}`}
            />
            <button type="button" onClick={saveCurrentCity} className={styles.button}>
              Save City
            </button>
          </div>
        </>
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
      {saved.length > 0 && (
        <div className={styles.saved}>
          <h2 className={styles.subheading}>Saved Cities</h2>
          {saved.map((w) => (
            <div
              key={w.city}
              className={styles.savedItem}
              onClick={() => openSavedCity(w.city)}
            >
              <div className={styles.savedHeader}>
                <WeatherIcon
                  code={w.weathercode}
                  isDay={w.isDay}
                  className={styles.icon}
                />
                <span>
                  {Math.round(unit === 'C' ? w.temperature : w.temperature * 1.8 + 32)}
                  &deg;{unit} - {w.city}, {w.country}
                  {w.windspeed != null && `, ${Math.round(w.windspeed)} km/h`}
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeCity(w.city);
                  }}
                  className={styles.button}
                >
                  Remove
                </button>
              </div>
              <div className={styles.extra}>
                {(() => {
                  const aqi = w.airQuality;
                  const category =
                    aqi == null
                      ? 'unknown'
                      : aqi <= 50
                      ? 'good'
                      : aqi <= 100
                      ? 'moderate'
                      : 'unhealthy';
                  const badgeClass =
                    category === 'good'
                      ? styles.aqiGood
                      : category === 'moderate'
                      ? styles.aqiModerate
                      : category === 'unhealthy'
                      ? styles.aqiUnhealthy
                      : styles.aqiUnknown;
                  const label =
                    category === 'good'
                      ? 'Good'
                      : category === 'moderate'
                      ? 'Moderate'
                      : category === 'unhealthy'
                      ? 'Unhealthy'
                      : 'N/A';
                  return (
                    <div className={styles.aqiRow}>
                      <div className={`${styles.aqiBadge} ${badgeClass}`} aria-label={`AQI ${label}`}>
                        <Link
                          className={styles.aqiInfo}
                          href="/weather/air-quality"
                          aria-label="World Air Quality (internal)"
                          title="World Air Quality (internal)"
                        >
                          i
                        </Link>
                      </div>
                      <span className={styles.aqiText}>AQI: {aqi ?? 'N/A'} {aqi != null && `(${label})`}</span>
                    </div>
                  );
                })()}
                {(() => {
                  const uv = w.uvIndex;
                  const category =
                    uv == null
                      ? 'unknown'
                      : uv <= 2
                      ? 'low'
                      : uv <= 5
                      ? 'moderate'
                      : uv <= 7
                      ? 'high'
                      : uv <= 10
                      ? 'veryhigh'
                      : 'extreme';
                  const badgeClass =
                    category === 'low'
                      ? styles.uvLow
                      : category === 'moderate'
                      ? styles.uvModerate
                      : category === 'high'
                      ? styles.uvHigh
                      : category === 'veryhigh'
                      ? styles.uvVeryHigh
                      : category === 'extreme'
                      ? styles.uvExtreme
                      : styles.uvUnknown;
                  const label =
                    category === 'low'
                      ? 'Low'
                      : category === 'moderate'
                      ? 'Moderate'
                      : category === 'high'
                      ? 'High'
                      : category === 'veryhigh'
                      ? 'Very High'
                      : category === 'extreme'
                      ? 'Extreme'
                      : 'N/A';
                  return (
                    <div className={styles.uvRow}>
                      <div className={`${styles.aqiBadge} ${badgeClass}`} aria-label={`UV ${label}`}>
                        <Link
                          className={styles.aqiInfo}
                          href="/weather/uv-index"
                          aria-label="World UV Index (internal)"
                          title="World UV Index (internal)"
                        >
                          i
                        </Link>
                      </div>
                      <span className={styles.uvText}>UV Index: {uv ?? 'N/A'} {uv != null && `(${label})`}</span>
                    </div>
                  );
                })()}
                {w.alerts.length > 0 && (
                  <ul className={styles.alerts}>
                    {w.alerts.map((a) => (
                      <li key={a}>{a}</li>
                    ))}
                  </ul>
                )}
              </div>
              {w.forecast.length > 0 && (
                <div className={styles.savedForecast}>
                  {w.forecast.map((d) => (
                    <div key={d.date} className={styles.savedForecastDay}>
                      <span className={styles.day}>
                        {new Date(d.date).toLocaleDateString([], { weekday: 'short' })}
                      </span>
                      <WeatherIcon
                        code={d.weathercode}
                        isDay
                        className={styles.smallIcon}
                      />
                      <span>
                        {Math.round(unit === 'C' ? d.max : d.max * 1.8 + 32)}°{unit}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
