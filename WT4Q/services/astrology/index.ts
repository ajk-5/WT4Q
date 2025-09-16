import { API_ROUTES } from '@/lib/api';
import { buildFallbackHoroscope } from './fallback';
import type { DailyHoroscope } from './types';

function todayUtcDate(): string {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
    .toISOString()
    .slice(0, 10);
}

function isValidHoroscope(payload: unknown): payload is DailyHoroscope {
  if (!payload || typeof payload !== 'object') return false;
  const candidate = payload as DailyHoroscope;
  return (
    typeof candidate.generatedFor === 'string' &&
    typeof candidate.generatedAt === 'string' &&
    Array.isArray(candidate.signs) &&
    candidate.signs.length === 12
  );
}

export async function getDailyHoroscope(): Promise<DailyHoroscope> {
  const fallbackDate = todayUtcDate();
  try {
    const response = await fetch(API_ROUTES.ASTROLOGY.TODAY, {
      cache: 'no-store',
      next: { revalidate: 0 },
    });
    if (!response.ok) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn(`[Astrology] Remote horoscope ${response.status}; using fallback`);
      }
      return buildFallbackHoroscope(fallbackDate);
    }

    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('[Astrology] Remote horoscope parse error; using fallback');
      }
      return buildFallbackHoroscope(fallbackDate);
    }

    if (!isValidHoroscope(payload)) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('[Astrology] Horoscope payload malformed; using fallback');
      }
      return buildFallbackHoroscope(fallbackDate);
    }
    return payload;
  } catch (error) {
    // Network or unexpected error: degrade gracefully without noisy stack traces
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[Astrology] Remote horoscope unavailable; using fallback');
    }
    return buildFallbackHoroscope(fallbackDate);
  }
}
