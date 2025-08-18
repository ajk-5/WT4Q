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

    const airRes = await fetch(
      `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${latitude}&longitude=${longitude}&hourly=us_aqi`
    );
    if (!airRes.ok) {
      return new Response(JSON.stringify({ message: 'Air quality fetch failed' }), {
        status: 500,
        headers: { 'content-type': 'application/json' },
      });
    }
    const airData = await airRes.json();
    const aqi = airData?.hourly?.us_aqi?.[0] ?? null;
    return new Response(JSON.stringify({ aqi }), {
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
