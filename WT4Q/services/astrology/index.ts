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
      throw new Error(`Failed to load horoscope: ${response.status}`);
    }
    const payload = (await response.json()) as unknown;
    if (!isValidHoroscope(payload)) {
      throw new Error('Horoscope payload malformed');
    }
    return payload;
  } catch (error) {
    console.error('[Astrology] Using local fallback horoscope', error);
    return buildFallbackHoroscope(fallbackDate);
  }
}
