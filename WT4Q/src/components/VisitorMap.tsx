'use client';
import { useEffect, useState } from 'react';
import { API_ROUTES } from '@/lib/api';
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
    fetch(API_ROUTES.USER_LOCATION.GET, { credentials: 'include' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setInfo(data))
      .catch(() => {});
  }, []);

  if (!info) return null;

  const [lat, lon] = info.location?.split(',') ?? [];
  const mapSrc = lat && lon
    ? `https://staticmap.openstreetmap.de/staticmap.php?center=${lat},${lon}&zoom=10&size=200x200&markers=${lat},${lon},red-pushpin`
    : undefined;

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>Last Login</h2>
      {mapSrc && (
        <img
          src={mapSrc}
          alt="Map showing your last location"
          className={styles.map}
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
