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

    const uvRes = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&hourly=uv_index`
    );
    if (!uvRes.ok) {
      return new Response(JSON.stringify({ message: 'UV fetch failed' }), {
        status: 500,
        headers: { 'content-type': 'application/json' },
      });
    }
    const uvData = await uvRes.json();
    const uv = uvData?.hourly?.uv_index?.[0] ?? null;
    return new Response(JSON.stringify({ uv }), {
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
