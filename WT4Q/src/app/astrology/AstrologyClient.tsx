'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import PrefetchLink from '@/components/PrefetchLink';
import { API_ROUTES, apiFetch } from '@/lib/api';
import type { DailyHoroscope, SignHoroscope } from '@/services/astrology/types';
import { ZODIAC_SIGNS } from '@/services/astrology/signs';
import styles from './Astrology.module.css';

type Props = {
  initialHoroscope: DailyHoroscope;
};

type Country = {
  name: string;
  code: string;
};

type SessionUser = {
  email: string;
  userName?: string;
};

type SubscriptionResponse = {
  signId: string;
  countryCode: string;
  timeZone: string;
  sendHour: number;
  lastSentLocalDate: string | null;
  active: boolean;
  signName: string;
  userName: string | null;
} | null;

const DEFAULT_SEND_HOUR = 5;

function formatDisplayDate(isoDate: string, timeZone?: string) {
  const date = new Date(`${isoDate}T00:00:00Z`);
  return date.toLocaleDateString('en-US', {
    timeZone: timeZone || 'UTC',
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatUtcTime(iso: string) {
  const time = new Date(iso);
  return time.toLocaleString('en-US', {
    timeZone: 'UTC',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function luckyNumbersText(sign: SignHoroscope) {
  if (!sign.luckyNumbers || sign.luckyNumbers.length === 0) return '—';
  return sign.luckyNumbers.join(', ');
}

export default function AstrologyClient({ initialHoroscope }: Props) {
  const [horoscope, setHoroscope] = useState<DailyHoroscope>(initialHoroscope);
  const [selectedSignId, setSelectedSignId] = useState<string>(
    initialHoroscope.signs[0]?.id || ZODIAC_SIGNS[0].id,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [countries, setCountries] = useState<Country[]>([]);
  const [user, setUser] = useState<SessionUser | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionResponse>(null);
  const [formSignId, setFormSignId] = useState<string>(initialHoroscope.signs[0]?.id || 'aries');
  const [countryCode, setCountryCode] = useState('');
  const [timeZone, setTimeZone] = useState<string>(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    } catch {
      return 'UTC';
    }
  });
  const [sendHour, setSendHour] = useState<number>(DEFAULT_SEND_HOUR);
  const [feedback, setFeedback] = useState('');
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const subscriptionSyncedRef = useRef(false);

  const selectedSign = useMemo(() => {
    return horoscope.signs.find((sign) => sign.id === selectedSignId) || horoscope.signs[0];
  }, [horoscope.signs, selectedSignId]);

  useEffect(() => {
    fetch('/datas/Countries.json')
      .then((res) => (res.ok ? res.json() : []))
      .then((data: Country[]) => {
        if (Array.isArray(data)) {
          const sorted = [...data].sort((a, b) => a.name.localeCompare(b.name));
          setCountries(sorted);
        }
      })
      .catch(() => setCountries([]));
  }, []);

  useEffect(() => {
    let mounted = true;
    apiFetch(API_ROUTES.AUTH.SESSION, { method: 'GET' })
      .then((res) => res.json())
      .then((session: { authenticated: boolean; user?: SessionUser }) => {
        if (!mounted) return;
        if (session.authenticated && session.user) {
          setUser(session.user);
        } else {
          setUser(null);
        }
      })
      .catch(() => {
        if (!mounted) return;
        setUser(null);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const loadSubscription = () => {
    if (!user) {
      setSubscription(null);
      subscriptionSyncedRef.current = false;
      return;
    }
    fetch('/api/astrology/subscribe', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: SubscriptionResponse) => {
        setSubscription(data);
        if (data) {
          setFormSignId(data.signId);
          setCountryCode(data.countryCode || '');
          setSendHour(data.sendHour || DEFAULT_SEND_HOUR);
          if (data.timeZone) setTimeZone(data.timeZone);
          if (!subscriptionSyncedRef.current) {
            setSelectedSignId(data.signId);
            subscriptionSyncedRef.current = true;
          }
        } else {
          subscriptionSyncedRef.current = false;
        }
      })
      .catch(() => setSubscription(null));
  };

  useEffect(() => {
    loadSubscription();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.email]);

  const handleRefresh = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/astrology/today', { cache: 'no-store' });
      if (!res.ok) {
        throw new Error('Unable to refresh horoscope');
      }
      const data: DailyHoroscope = await res.json();
      setHoroscope(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to refresh horoscope');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectSign = (id: string) => {
    setSelectedSignId(id);
    setFormSignId(id);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user) return;
    setSubmitting(true);
    setFormError('');
    setFeedback('');
    try {
      const res = await fetch('/api/astrology/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          signId: formSignId,
          countryCode,
          timeZone,
          sendHour,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.message || 'Unable to save preference');
      }
      const data: SubscriptionResponse = await res.json();
      setSubscription(data);
      subscriptionSyncedRef.current = true;
      setFeedback(
        `Daily horoscope emails enabled for ${data?.signName || formSignId}. Delivery scheduled for ${sendHour}:00 AM ${timeZone}.`,
      );
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Unable to save preference');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUnsubscribe = async () => {
    if (!user) return;
    setSubmitting(true);
    setFormError('');
    setFeedback('');
    try {
      const res = await fetch('/api/astrology/subscribe', { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.message || 'Unable to update subscription');
      }
      setSubscription(null);
      subscriptionSyncedRef.current = false;
      setFeedback('Daily horoscope emails have been disabled.');
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Unable to update subscription');
    } finally {
      setSubmitting(false);
    }
  };

  const heroDate = formatDisplayDate(horoscope.generatedFor, timeZone);

  return (
    <main className={styles.main}>
      <header className={styles.hero}>
        <p className={styles.heroDate}>{heroDate}</p>
        <h1 className={styles.heroTitle}>Today&apos;s Cosmic Horoscope</h1>
        <p className={styles.heroSummary}>{horoscope.summary}</p>
        <div className={styles.heroHighlights}>
          <article className={styles.heroCard}>
            <h2>Cosmic Weather</h2>
            <p>{horoscope.cosmicWeather}</p>
          </article>
          <article className={styles.heroCard}>
            <h2>Lunar Pulse</h2>
            <p>{horoscope.lunarPhase}</p>
          </article>
          <article className={styles.heroCard}>
            <h2>Daily Highlight</h2>
            <p>{horoscope.highlight}</p>
          </article>
        </div>
        <div className={styles.heroActions}>
          <button
            type="button"
            onClick={handleRefresh}
            className={styles.refreshButton}
            disabled={loading}
          >
            {loading ? 'Refreshing…' : 'Refresh horoscope'}
          </button>
          <span className={styles.generatedTime}>Generated at {formatUtcTime(horoscope.generatedAt)} UTC</span>
        </div>
        {error && <p className={styles.error}>{error}</p>}
      </header>

      <section className={styles.signGridSection}>
        <h2 className={styles.sectionTitle}>Select your sign</h2>
        <div className={styles.signGrid}>
          {horoscope.signs.map((sign) => (
            <button
              key={sign.id}
              type="button"
              className={`${styles.signCard} ${selectedSignId === sign.id ? styles.signCardActive : ''}`}
              onClick={() => handleSelectSign(sign.id)}
              aria-pressed={selectedSignId === sign.id}
            >
              <Image
                src={sign.icon}
                alt={`${sign.name} symbol`}
                width={72}
                height={72}
                className={styles.signIcon}
              />
              <span className={styles.signName}>{sign.name}</span>
              <span className={styles.signDates}>{sign.dateRange}</span>
              <span className={styles.signEnergy}>{sign.energy}</span>
            </button>
          ))}
        </div>
      </section>

      {selectedSign && (
        <section className={styles.detailSection}>
          <header className={styles.detailHeader}>
            <div className={styles.detailHeading}>
              <Image
                src={selectedSign.icon}
                alt={`${selectedSign.name} glyph`}
                width={96}
                height={96}
                className={styles.detailIcon}
              />
              <div>
                <h2>{selectedSign.name}</h2>
                <p className={styles.detailMeta}>
                  {selectedSign.dateRange} • {selectedSign.element} • {selectedSign.modality} •{' '}
                  {selectedSign.rulingPlanet}
                </p>
                <p className={styles.detailMantra}>{selectedSign.mantra}</p>
              </div>
            </div>
            <div className={styles.detailStats}>
              <div>
                <span className={styles.label}>Mood</span>
                <span>{selectedSign.mood}</span>
              </div>
              <div>
                <span className={styles.label}>Aura Color</span>
                <span>{selectedSign.color}</span>
              </div>
              <div>
                <span className={styles.label}>Lucky Numbers</span>
                <span>{luckyNumbersText(selectedSign)}</span>
              </div>
            </div>
          </header>
          <div className={styles.detailBody}>
            <article className={styles.detailCard}>
              <h3>General Outlook</h3>
              <p>{selectedSign.outlook.general}</p>
              <h4>Love &amp; Relations</h4>
              <p>{selectedSign.outlook.love}</p>
              <h4>Career &amp; Purpose</h4>
              <p>{selectedSign.outlook.career}</p>
              <h4>Wellness</h4>
              <p>{selectedSign.outlook.wellness}</p>
            </article>
            <article className={styles.detailCard}>
              <h3>Relational Constellations</h3>
              <ul>
                <li>
                  <span className={styles.label}>People</span>
                  <p>{selectedSign.relations.people}</p>
                </li>
                <li>
                  <span className={styles.label}>Pets</span>
                  <p>{selectedSign.relations.pets}</p>
                </li>
                <li>
                  <span className={styles.label}>Stars</span>
                  <p>{selectedSign.relations.stars}</p>
                </li>
                <li>
                  <span className={styles.label}>Planets</span>
                  <p>{selectedSign.relations.planets}</p>
                </li>
                <li>
                  <span className={styles.label}>Stones</span>
                  <p>{selectedSign.relations.stones}</p>
                </li>
              </ul>
            </article>
            <article className={styles.detailCard}>
              <h3>Guided Rituals</h3>
              <ul>
                <li>
                  <span className={styles.label}>Morning ritual</span>
                  <p>{selectedSign.guidance.ritual}</p>
                </li>
                <li>
                  <span className={styles.label}>Reflection prompt</span>
                  <p>{selectedSign.guidance.reflection}</p>
                </li>
                <li>
                  <span className={styles.label}>Adventure cue</span>
                  <p>{selectedSign.guidance.adventure}</p>
                </li>
              </ul>
            </article>
          </div>
        </section>
      )}

      <section className={styles.subscriptionSection}>
        <h2 className={styles.sectionTitle}>Daily horoscope email</h2>
        <p className={styles.subscriptionIntro}>
          We compile your sign&apos;s horoscope every night at 00:00 GMT using Gemini, then deliver it to your
          inbox at dawn. Choose a 5:00 AM or 6:00 AM delivery in your local timezone.
        </p>
        {user ? (
          <form onSubmit={handleSubmit} className={styles.subscriptionForm}>
            <div className={styles.formRow}>
              <label className={styles.formField}>
                Zodiac sign
                <select
                  value={formSignId}
                  onChange={(e) => {
                    setFormSignId(e.target.value);
                    setSelectedSignId(e.target.value);
                  }}
                  className={styles.select}
                >
                  {horoscope.signs.map((sign) => (
                    <option key={sign.id} value={sign.id}>
                      {sign.name} ({sign.dateRange})
                    </option>
                  ))}
                </select>
              </label>
              <label className={styles.formField}>
                Country
                <select
                  value={countryCode}
                  onChange={(e) => setCountryCode(e.target.value)}
                  className={styles.select}
                >
                  <option value="">Select country</option>
                  {countries.map((country) => (
                    <option key={country.code} value={country.code}>
                      {country.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className={styles.formRow}>
              <label className={styles.formField}>
                Time zone
                <input
                  type="text"
                  value={timeZone}
                  onChange={(e) => setTimeZone(e.target.value)}
                  className={styles.input}
                  placeholder="e.g. America/New_York"
                  required
                />
                <span className={styles.helpText}>
                  Detected: {timeZone || 'UTC'} — emails send at your selected hour.
                </span>
              </label>
              <fieldset className={`${styles.formField} ${styles.radioField}`}>
                <legend className={styles.legend}>Delivery time</legend>
                <label className={styles.radioOption}>
                  <input
                    type="radio"
                    name="sendHour"
                    value="5"
                    checked={sendHour === 5}
                    onChange={() => setSendHour(5)}
                  />
                  5:00 AM
                </label>
                <label className={styles.radioOption}>
                  <input
                    type="radio"
                    name="sendHour"
                    value="6"
                    checked={sendHour === 6}
                    onChange={() => setSendHour(6)}
                  />
                  6:00 AM
                </label>
              </fieldset>
            </div>
            <div className={styles.formActions}>
              <button type="submit" className={styles.submitButton} disabled={submitting}>
                {submitting ? 'Saving…' : 'Save preferences'}
              </button>
              {subscription && (
                <button
                  type="button"
                  className={styles.unsubscribeButton}
                  onClick={handleUnsubscribe}
                  disabled={submitting}
                >
                  Stop emails
                </button>
              )}
            </div>
            {feedback && <p className={styles.success}>{feedback}</p>}
            {formError && <p className={styles.error}>{formError}</p>}
            {subscription?.lastSentLocalDate && (
              <p className={styles.helpText}>
                Last delivered on {formatDisplayDate(subscription.lastSentLocalDate, timeZone)}.
              </p>
            )}
          </form>
        ) : (
          <div className={styles.loginPrompt}>
            <p>Sign in to schedule your personalised daily horoscope email.</p>
            <PrefetchLink href="/login" className={styles.loginLink}>
              Sign in to subscribe
            </PrefetchLink>
          </div>
        )}
      </section>
    </main>
  );
}
