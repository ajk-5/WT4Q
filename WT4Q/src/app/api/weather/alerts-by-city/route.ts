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

    const alertRes = await fetch(
      `https://api.open-meteo.com/v1/warnings?latitude=${latitude}&longitude=${longitude}`
    );
    if (!alertRes.ok) {
      return new Response(JSON.stringify({ alerts: [] }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }
    const alertData = await alertRes.json();
    interface Warning {
      event?: string;
      title?: string;
      [key: string]: unknown;
    }
    const alerts = Array.isArray(alertData?.warnings)
      ? (alertData.warnings as Warning[])
          .map((w) => w.event || w.title || '')
          .filter((s) => typeof s === 'string' && s.length > 0)
      : [];
    return new Response(JSON.stringify({ alerts }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  } catch {
    return new Response(JSON.stringify({ alerts: [] }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  }
}
