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
    const { latitude, longitude } = geoData.results[0];

    const forecastRes = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&daily=weathercode,temperature_2m_max,temperature_2m_min&forecast_days=3&timezone=auto`
    );
    if (!forecastRes.ok) {
      return new Response(JSON.stringify({ message: 'Weather fetch failed' }), {
        status: 500,
        headers: { 'content-type': 'application/json' },
      });
    }
    const forecastData = await forecastRes.json();
    const daily = forecastData.daily;
    if (!daily || !Array.isArray(daily.time)) {
      return new Response(JSON.stringify({ message: 'Forecast unavailable' }), {
        status: 500,
        headers: { 'content-type': 'application/json' },
      });
    }
    const forecast = daily.time.map((t: string, i: number) => ({
      date: t,
      weathercode: daily.weathercode[i],
      max: daily.temperature_2m_max[i],
      min: daily.temperature_2m_min[i],
    }));
    return new Response(JSON.stringify({ forecast }), {
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
