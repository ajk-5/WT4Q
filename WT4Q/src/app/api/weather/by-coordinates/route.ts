type CacheEntry = { data: unknown; expires: number };
const cache = new Map<string, CacheEntry>();

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const latStr = searchParams.get('lat');
  const lonStr = searchParams.get('lon');

  if (!latStr || !lonStr) {
    return new Response(JSON.stringify({ message: 'lat and lon are required' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    });
  }

  const latitude = Number(latStr);
  const longitude = Number(lonStr);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return new Response(JSON.stringify({ message: 'Invalid coordinates' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    });
  }

  try {
    const cacheKey = `${latitude.toFixed(4)},${longitude.toFixed(4)}`;
    const cached = cache.get(cacheKey);
    if (cached && cached.expires > Date.now()) {
      return new Response(JSON.stringify(cached.data), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }

    // Reverse geocode to get city/country
    let name = '';
    let country = '';
    try {
      const revRes = await fetch(
        `https://geocoding-api.open-meteo.com/v1/reverse?latitude=${latitude}&longitude=${longitude}&count=1&language=en`
      );
      if (revRes.ok) {
        const rev = await revRes.json();
        if (Array.isArray(rev?.results) && rev.results.length > 0) {
          name = rev.results[0]?.name || '';
          country = rev.results[0]?.country || '';
        }
      }
    } catch {
      // ignore reverse geocode failure
    }

    // Current weather
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

    // Air quality (US AQI)
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

    // UV index
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

    // Weather alerts (met.no)
    let alerts: string[] = [];
    try {
      const alertRes = await fetch(
        `https://api.met.no/weatherapi/metalerts/2.0/complete?lat=${latitude}&lon=${longitude}`,
        {
          headers: {
            'User-Agent': '90stimes/1.0 https://www.90stimes.com',
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
      city: name || 'My Location',
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

