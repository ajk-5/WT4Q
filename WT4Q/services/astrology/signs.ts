export interface ZodiacSign {
  id:
    | 'aries'
    | 'taurus'
    | 'gemini'
    | 'cancer'
    | 'leo'
    | 'virgo'
    | 'libra'
    | 'scorpio'
    | 'sagittarius'
    | 'capricorn'
    | 'aquarius'
    | 'pisces';
  name: string;
  startMonth: number;
  startDay: number;
  endMonth: number;
  endDay: number;
  element: 'Fire' | 'Earth' | 'Air' | 'Water';
  modality: 'Cardinal' | 'Fixed' | 'Mutable';
  rulingPlanet: string;
  icon: string;
  keywords: string[];
}

export const ZODIAC_SIGNS: ZodiacSign[] = [
  {
    id: 'aries',
    name: 'Aries',
    startMonth: 3,
    startDay: 21,
    endMonth: 4,
    endDay: 19,
    element: 'Fire',
    modality: 'Cardinal',
    rulingPlanet: 'Mars',
    icon: '/images/astrology/aries.svg',
    keywords: ['trailblazing', 'spontaneous', 'courageous'],
  },
  {
    id: 'taurus',
    name: 'Taurus',
    startMonth: 4,
    startDay: 20,
    endMonth: 5,
    endDay: 20,
    element: 'Earth',
    modality: 'Fixed',
    rulingPlanet: 'Venus',
    icon: '/images/astrology/taurus.svg',
    keywords: ['grounded', 'sensual', 'steadfast'],
  },
  {
    id: 'gemini',
    name: 'Gemini',
    startMonth: 5,
    startDay: 21,
    endMonth: 6,
    endDay: 20,
    element: 'Air',
    modality: 'Mutable',
    rulingPlanet: 'Mercury',
    icon: '/images/astrology/gemini.svg',
    keywords: ['curious', 'expressive', 'versatile'],
  },
  {
    id: 'cancer',
    name: 'Cancer',
    startMonth: 6,
    startDay: 21,
    endMonth: 7,
    endDay: 22,
    element: 'Water',
    modality: 'Cardinal',
    rulingPlanet: 'Moon',
    icon: '/images/astrology/cancer.svg',
    keywords: ['nurturing', 'intuitive', 'protective'],
  },
  {
    id: 'leo',
    name: 'Leo',
    startMonth: 7,
    startDay: 23,
    endMonth: 8,
    endDay: 22,
    element: 'Fire',
    modality: 'Fixed',
    rulingPlanet: 'Sun',
    icon: '/images/astrology/leo.svg',
    keywords: ['radiant', 'dramatic', 'charismatic'],
  },
  {
    id: 'virgo',
    name: 'Virgo',
    startMonth: 8,
    startDay: 23,
    endMonth: 9,
    endDay: 22,
    element: 'Earth',
    modality: 'Mutable',
    rulingPlanet: 'Mercury',
    icon: '/images/astrology/virgo.svg',
    keywords: ['practical', 'precise', 'service-oriented'],
  },
  {
    id: 'libra',
    name: 'Libra',
    startMonth: 9,
    startDay: 23,
    endMonth: 10,
    endDay: 22,
    element: 'Air',
    modality: 'Cardinal',
    rulingPlanet: 'Venus',
    icon: '/images/astrology/libra.svg',
    keywords: ['harmonising', 'diplomatic', 'refined'],
  },
  {
    id: 'scorpio',
    name: 'Scorpio',
    startMonth: 10,
    startDay: 23,
    endMonth: 11,
    endDay: 21,
    element: 'Water',
    modality: 'Fixed',
    rulingPlanet: 'Pluto',
    icon: '/images/astrology/scorpio.svg',
    keywords: ['intense', 'transformative', 'magnetic'],
  },
  {
    id: 'sagittarius',
    name: 'Sagittarius',
    startMonth: 11,
    startDay: 22,
    endMonth: 12,
    endDay: 21,
    element: 'Fire',
    modality: 'Mutable',
    rulingPlanet: 'Jupiter',
    icon: '/images/astrology/sagittarius.svg',
    keywords: ['adventurous', 'optimistic', 'philosophical'],
  },
  {
    id: 'capricorn',
    name: 'Capricorn',
    startMonth: 12,
    startDay: 22,
    endMonth: 1,
    endDay: 19,
    element: 'Earth',
    modality: 'Cardinal',
    rulingPlanet: 'Saturn',
    icon: '/images/astrology/capricorn.svg',
    keywords: ['ambitious', 'structured', 'resilient'],
  },
  {
    id: 'aquarius',
    name: 'Aquarius',
    startMonth: 1,
    startDay: 20,
    endMonth: 2,
    endDay: 18,
    element: 'Air',
    modality: 'Fixed',
    rulingPlanet: 'Uranus',
    icon: '/images/astrology/aquarius.svg',
    keywords: ['visionary', 'progressive', 'unconventional'],
  },
  {
    id: 'pisces',
    name: 'Pisces',
    startMonth: 2,
    startDay: 19,
    endMonth: 3,
    endDay: 20,
    element: 'Water',
    modality: 'Mutable',
    rulingPlanet: 'Neptune',
    icon: '/images/astrology/pisces.svg',
    keywords: ['dreamy', 'empathetic', 'mystical'],
  },
];

function pad(num: number): string {
  return num.toString().padStart(2, '0');
}

function monthName(month: number): string {
  return new Date(Date.UTC(2000, month - 1, 1)).toLocaleString('en-US', { month: 'short' });
}

export function formatDateRange(sign: ZodiacSign): string {
  const start = `${monthName(sign.startMonth)} ${pad(sign.startDay)}`;
  const end = `${monthName(sign.endMonth)} ${pad(sign.endDay)}`;
  return `${start} – ${end}`;
}

export function findZodiacSign(id: string): ZodiacSign | undefined {
  return ZODIAC_SIGNS.find((sign) => sign.id === id);
}
