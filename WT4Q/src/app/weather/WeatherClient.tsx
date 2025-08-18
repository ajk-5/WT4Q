'use client';
import { ReactElement, useState, useEffect } from 'react';
import WeatherIcon from '@/components/WeatherIcon';
import WindIcon from '@/components/WindIcon';
import { MapContainer, TileLayer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
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
  aqi?: number | null;
  uv?: number | null;
  alerts?: string[];
}

interface RadarData {
  tileUrl: string;
  timestamp: number;
  latitude: number;
  longitude: number;
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
  const [saved, setSaved] = useState<SavedCity[]>([]);
  const [notice, setNotice] = useState('');
  const [radar, setRadar] = useState<RadarData | null>(null);
  const [aqi, setAqi] = useState<number | null>(null);
  const [uv, setUv] = useState<number | null>(null);
  const [alerts, setAlerts] = useState<string[]>([]);

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem('savedCities') || '[]') as string[];
    if (stored.length > 0) {
      Promise.all(
        stored.map(async (c) => {
          const wRes = await fetch(`/api/weather/by-city?city=${encodeURIComponent(c)}`);
          const fRes = await fetch(
            `/api/weather/daily-forecast-by-city?city=${encodeURIComponent(c)}`
          );
          const aqRes = await fetch(
            `/api/weather/air-quality-by-city?city=${encodeURIComponent(c)}`
          );
          const uvRes = await fetch(
            `/api/weather/uv-index-by-city?city=${encodeURIComponent(c)}`
          );
          const alRes = await fetch(
            `/api/weather/alerts-by-city?city=${encodeURIComponent(c)}`
          );
          if (wRes.ok && fRes.ok) {
            const wData = await wRes.json();
            const fData = await fRes.json();
            const aqData = aqRes.ok ? await aqRes.json() : { aqi: null };
            const uvData = uvRes.ok ? await uvRes.json() : { uv: null };
            const alData = alRes.ok ? await alRes.json() : { alerts: [] };
            return {
              ...wData,
              forecast: Array.isArray(fData.forecast) ? fData.forecast : [],
              aqi: aqData.aqi ?? null,
              uv: uvData.uv ?? null,
              alerts: Array.isArray(alData.alerts) ? alData.alerts : [],
            } as SavedCity;
          }
          return null;
        })
      ).then((list) => setSaved(list.filter(Boolean) as SavedCity[]));
    }
  }, []);

  const saveCurrentCity = async () => {
    if (!weather) return;
    const stored = JSON.parse(localStorage.getItem('savedCities') || '[]') as string[];
    if (stored.includes(weather.city)) return;
    stored.push(weather.city);
    localStorage.setItem('savedCities', JSON.stringify(stored));
    const [fRes, aqRes, uvRes, alRes] = await Promise.all([
      fetch(`/api/weather/daily-forecast-by-city?city=${encodeURIComponent(weather.city)}`),
      fetch(`/api/weather/air-quality-by-city?city=${encodeURIComponent(weather.city)}`),
      fetch(`/api/weather/uv-index-by-city?city=${encodeURIComponent(weather.city)}`),
      fetch(`/api/weather/alerts-by-city?city=${encodeURIComponent(weather.city)}`),
    ]);
    const fData = fRes.ok ? await fRes.json() : { forecast: [] };
    const aqData = aqRes.ok ? await aqRes.json() : { aqi: null };
    const uvData = uvRes.ok ? await uvRes.json() : { uv: null };
    const alData = alRes.ok ? await alRes.json() : { alerts: [] };
    setSaved([
      ...saved,
      {
        ...weather,
        forecast: Array.isArray(fData.forecast) ? fData.forecast : [],
        aqi: aqData.aqi ?? null,
        uv: uvData.uv ?? null,
        alerts: Array.isArray(alData.alerts) ? alData.alerts : [],
      },
    ]);
    setNotice('City saved');
    setTimeout(() => setNotice(''), 3000);
  };

  const removeCity = (name: string) => {
    const stored = JSON.parse(localStorage.getItem('savedCities') || '[]') as string[];
    const updated = stored.filter((c) => c !== name);
    localStorage.setItem('savedCities', JSON.stringify(updated));
    setSaved(saved.filter((w) => w.city !== name));
  };

  const loadCity = async (name: string) => {
    try {
      setError('');
      const res = await fetch(`/api/weather/by-city?city=${encodeURIComponent(name)}`);
      if (res.ok) {
        const data: Weather = await res.json();
        setWeather(data);
        const [fRes, rRes, aqRes, uvRes, alRes] = await Promise.all([
          fetch(`/api/weather/forecast-by-city?city=${encodeURIComponent(name)}`),
          fetch(`/api/weather/radar-by-city?city=${encodeURIComponent(name)}`),
          fetch(`/api/weather/air-quality-by-city?city=${encodeURIComponent(name)}`),
          fetch(`/api/weather/uv-index-by-city?city=${encodeURIComponent(name)}`),
          fetch(`/api/weather/alerts-by-city?city=${encodeURIComponent(name)}`),
        ]);
        if (fRes.ok) {
          const fData = await fRes.json();
          setForecast(Array.isArray(fData.forecast) ? fData.forecast : []);
        } else {
          setForecast([]);
        }
        setRadar(rRes.ok ? await rRes.json() : null);
        const aqData = aqRes.ok ? await aqRes.json() : { aqi: null };
        setAqi(aqData.aqi ?? null);
        const uvData = uvRes.ok ? await uvRes.json() : { uv: null };
        setUv(uvData.uv ?? null);
        const alData = alRes.ok ? await alRes.json() : { alerts: [] };
        setAlerts(Array.isArray(alData.alerts) ? alData.alerts : []);
      } else {
        const data = await res.json().catch(() => null);
        setError(data?.message || 'Unable to fetch weather');
        setWeather(null);
        setForecast([]);
        setRadar(null);
        setAqi(null);
        setUv(null);
        setAlerts([]);
      }
    } catch {
      setError('Unable to fetch weather');
      setWeather(null);
      setForecast([]);
      setRadar(null);
      setAqi(null);
      setUv(null);
      setAlerts([]);
    }
  };

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
          {aqi != null && (
            <div className={`${styles.aqi} ${styles[`aqi-${aqiCategory(aqi)}`]}`}>
              AQI: {aqi} ({aqiLabel(aqi)})
            </div>
          )}
          {uv != null && (
            <div className={`${styles.uv} ${styles[`uv-${uvCategory(uv)}`]}`}>
              UV Index: {uv} ({uvLabel(uv)})
            </div>
          )}
          {alerts.length > 0 && (
            <div className={styles.alerts}>
              {alerts.map((a) => (
                <div key={a} className={styles.alert}>
                  {a}
                </div>
              ))}
            </div>
          )}
          <div className={styles.mapContainer}>
            <iframe
              className={styles.map}
              src={`https://www.openstreetmap.org/export/embed.html?bbox=${weather.longitude - 0.05},${weather.latitude - 0.05},${weather.longitude + 0.05},${weather.latitude + 0.05}&layer=mapnik&marker=${weather.latitude},${weather.longitude}`}
            />
            <button type="button" onClick={saveCurrentCity} className={styles.button}>
              Save City
            </button>
          </div>
          {radar && (
            <div className={styles.radarContainer}>
              <MapContainer
                center={[weather.latitude, weather.longitude]}
                zoom={7}
                className={styles.radarMap}
              >
                <TileLayer url={radar.tileUrl} />
              </MapContainer>
            </div>
          )}
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
              <div className={styles.savedDetails}>
                {w.aqi != null && <span className={styles.aqiSmall}>AQI: {w.aqi}</span>}
                {w.uv != null && <span className={styles.uvSmall}>UV: {w.uv}</span>}
                {w.alerts && w.alerts.length > 0 && (
                  <span className={styles.alertSmall}>⚠ {w.alerts[0]}</span>
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

function aqiCategory(value: number): string {
  if (value <= 50) return 'good';
  if (value <= 100) return 'moderate';
  if (value <= 150) return 'usg';
  if (value <= 200) return 'unhealthy';
  if (value <= 300) return 'very-unhealthy';
  return 'hazardous';
}

function aqiLabel(value: number): string {
  const cat = aqiCategory(value);
  switch (cat) {
    case 'good':
      return 'Good';
    case 'moderate':
      return 'Moderate';
    case 'usg':
      return 'Unhealthy for Sensitive';
    case 'unhealthy':
      return 'Unhealthy';
    case 'very-unhealthy':
      return 'Very Unhealthy';
    default:
      return 'Hazardous';
  }
}

function uvCategory(value: number): string {
  if (value < 3) return 'low';
  if (value < 6) return 'moderate';
  if (value < 8) return 'high';
  if (value < 11) return 'very-high';
  return 'extreme';
}

function uvLabel(value: number): string {
  const cat = uvCategory(value);
  switch (cat) {
    case 'low':
      return 'Low';
    case 'moderate':
      return 'Moderate';
    case 'high':
      return 'High';
    case 'very-high':
      return 'Very High';
    default:
      return 'Extreme';
  }
}
