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

    const metRes = await fetch(
      `https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=${latitude}&lon=${longitude}`,
      {
        headers: { 'User-Agent': 'WT4Q/1.0 https://example.com' },
      }
    );
    if (!metRes.ok) {
      return new Response(JSON.stringify({ message: 'Weather fetch failed' }), {
        status: 500,
        headers: { 'content-type': 'application/json' },
      });
    }
    const metData = await metRes.json();
    const series = metData.properties?.timeseries;
    if (!Array.isArray(series)) {
      return new Response(JSON.stringify({ message: 'Forecast unavailable' }), {
        status: 500,
        headers: { 'content-type': 'application/json' },
      });
    }
    interface MetEntry {
      time: string;
      data: {
        instant: {
          details: {
            air_temperature: number;
            wind_speed?: number;
          };
        };
        next_1_hours?: {
          summary?: {
            symbol_code?: string;
          };
        };
      };
    }
    const forecast = (series as MetEntry[]).slice(0, 24).map((entry) => ({
      time: entry.time,
      temperature: entry.data.instant.details.air_temperature,
      windspeed: entry.data.instant.details.wind_speed ?? null,
      symbol: entry.data.next_1_hours?.summary?.symbol_code ?? null,
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
