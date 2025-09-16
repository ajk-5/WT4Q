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
    const metRes = await fetch(
      `https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=${latitude}&lon=${longitude}`,
      {
        headers: { 'User-Agent': '90stimes/1.0 https://www.90stimes.com' },
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

