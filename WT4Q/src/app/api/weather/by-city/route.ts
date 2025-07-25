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
    return new Response(
      JSON.stringify({
        city: name,
        country,
        temperature: current.temperature,
        weathercode: current.weathercode,
        isDay: current.is_day === 1,
        windspeed: current.windspeed ?? null,
      }),
      {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }
    );
  } catch {
    return new Response(JSON.stringify({ message: 'Request failed' }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    });
  }
}
