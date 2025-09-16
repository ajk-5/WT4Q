export interface HoroscopeOutlook {
  general: string;
  love: string;
  career: string;
  wellness: string;
}

export interface HoroscopeRelations {
  people: string;
  pets: string;
  planets: string;
  stars: string;
  stones: string;
}

export interface HoroscopeGuidance {
  ritual: string;
  reflection: string;
  adventure: string;
}

export interface SignHoroscope {
  id: string;
  name: string;
  dateRange: string;
  element: string;
  modality: string;
  rulingPlanet: string;
  icon: string;
  headline: string;
  summary: string;
  energy: string;
  outlook: HoroscopeOutlook;
  relations: HoroscopeRelations;
  guidance: HoroscopeGuidance;
  mood: string;
  color: string;
  mantra: string;
  luckyNumbers: number[];
}

export interface DailyHoroscope {
  generatedFor: string; // YYYY-MM-DD in UTC
  generatedAt: string; // ISO timestamp
  summary: string;
  cosmicWeather: string;
  lunarPhase: string;
  highlight: string;
  signs: SignHoroscope[];
}

export interface GeminiHoroscopeResponse {
  generatedFor: string;
  summary: string;
  cosmicWeather: string;
  lunarPhase: string;
  highlight: string;
  signs: {
    id: string;
    headline: string;
    summary: string;
    energy: string;
    outlook: HoroscopeOutlook;
    relations: HoroscopeRelations;
    guidance: HoroscopeGuidance;
    mood: string;
    color: string;
    mantra: string;
    luckyNumbers: number[];
  }[];
}

export interface AstrologySubscription {
  email: string;
  userId?: string;
  userName?: string;
  signId: string;
  countryCode: string;
  timeZone: string;
  sendHour: number;
  createdAt: string;
  updatedAt: string;
  lastSentLocalDate?: string; // YYYY-MM-DD in subscriber timezone
  active: boolean;
}

export interface DispatchReport {
  sent: number;
  attempted: number;
  skipped: number;
  pending: number;
  detail: {
    email: string;
    reason?: string;
    status: 'sent' | 'skipped' | 'pending';
  }[];
}
