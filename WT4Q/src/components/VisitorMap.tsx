'use client';
import { useEffect, useState } from 'react';
import { API_ROUTES, apiFetch } from '@/lib/api';
import styles from './VisitorMap.module.css';

interface VisitorInfo {
  location?: string;
  city?: string;
  country?: string;
  visitTime?: string;
}

export default function VisitorMap() {
  const [info, setInfo] = useState<VisitorInfo | null>(null);

  useEffect(() => {
    apiFetch(API_ROUTES.USER_LOCATION.GET)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setInfo(data))
      .catch(() => {});
  }, []);

  if (!info) return null;

  const [lat, lon] = info.location?.split(',') ?? [];
  const mapSrc = lat && lon

    ? (() => {
        const delta = 0.02;
        const latNum = parseFloat(lat);
        const lonNum = parseFloat(lon);
        const bbox = `${lonNum - delta},${latNum - delta},${lonNum + delta},${latNum + delta}`;
        return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${latNum},${lonNum}`;
      })()

    : undefined;

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>Last Login</h2>
      {mapSrc && (
        <iframe
          src={mapSrc}
          title="Map showing your last location"
          className={styles.map}
          width={200}
          height={200}
        />
      )}
      {info.visitTime && (
        <p className={styles.info}>
          {new Date(info.visitTime).toLocaleString(undefined, {
            dateStyle: 'medium',
            timeStyle: 'short',
          })}
        </p>
      )}
    </div>
  );
}
