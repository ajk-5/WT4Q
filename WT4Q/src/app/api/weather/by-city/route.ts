type CacheEntry = { data: unknown; expires: number };
const cache = new Map<string, CacheEntry>();

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const city = searchParams.get('city');
  if (!city) {
    return new Response(JSON.stringify({ message: 'City is required' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    });
  }

  try {
    const geoRes = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1`
    );
    if (!geoRes.ok) {
      return new Response(JSON.stringify({ message: 'Geocoding failed' }), {
        status: 500,
        headers: { 'content-type': 'application/json' },
      });
    }
    const geoData = await geoRes.json();
    if (!geoData.results || geoData.results.length === 0) {
      return new Response(JSON.stringify({ message: 'City not found' }), {
        status: 404,
        headers: { 'content-type': 'application/json' },
      });
    }
    const { latitude, longitude, name, country } = geoData.results[0];

    const cacheKey = `${latitude},${longitude}`;
    const cached = cache.get(cacheKey);
    if (cached && cached.expires > Date.now()) {
      return new Response(JSON.stringify(cached.data), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }

    const weatherRes = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true`
    );
    if (!weatherRes.ok) {
      return new Response(JSON.stringify({ message: 'Weather fetch failed' }), {
        status: 500,
        headers: { 'content-type': 'application/json' },
      });
    }
    const weatherData = await weatherRes.json();
    const current = weatherData.current_weather;
    if (!current) {
      return new Response(JSON.stringify({ message: 'Weather data unavailable' }), {
        status: 500,
        headers: { 'content-type': 'application/json' },
      });
    }

    let airQuality: number | null = null;
    try {
      const aqiRes = await fetch(
        `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${latitude}&longitude=${longitude}&current=us_aqi`
      );
      if (aqiRes.ok) {
        const aqiData = await aqiRes.json();
        airQuality = aqiData.current?.us_aqi ?? null;
      }
    } catch {
      airQuality = null;
    }

    let uvIndex: number | null = null;
    try {
      const uvRes = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=uv_index`
      );
      if (uvRes.ok) {
        const uvData = await uvRes.json();
        uvIndex = uvData.current?.uv_index ?? null;
      }
    } catch {
      uvIndex = null;
    }

    let alerts: string[] = [];
    try {
      const alertRes = await fetch(
        `https://api.met.no/weatherapi/metalerts/2.0/complete?lat=${latitude}&lon=${longitude}`,
        {
          headers: {
            'User-Agent': 'WT4Q/1.0 https://example.com',
            Accept: 'application/json',
          },
        }
      );
      if (alertRes.ok) {
        const alertData = await alertRes.json().catch(() => null);
        if (Array.isArray(alertData?.features)) {
          alerts = (alertData.features as {
            properties?: { event?: string; headline?: string };
          }[])
            .map((f) => f.properties?.event ?? f.properties?.headline)
            .filter((v): v is string => Boolean(v));
        }
      }
    } catch {
      alerts = [];
    }

    const result = {
      city: name,
      country,
      latitude,
      longitude,
      temperature: current.temperature,
      weathercode: current.weathercode,
      isDay: current.is_day === 1,
      windspeed: current.windspeed ?? null,
      airQuality,
      uvIndex,
      alerts,
    };

    cache.set(cacheKey, { data: result, expires: Date.now() + 10 * 60 * 1000 });

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  } catch {
    return new Response(JSON.stringify({ message: 'Request failed' }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    });
  }
}
