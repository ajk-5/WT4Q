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

    const mapsRes = await fetch('https://api.rainviewer.com/public/weather-maps.json');
    if (!mapsRes.ok) {
      return new Response(JSON.stringify({ message: 'Radar fetch failed' }), {
        status: 500,
        headers: { 'content-type': 'application/json' },
      });
    }
    const mapsData = await mapsRes.json();
    const past = mapsData?.radar?.past;
    const latest = Array.isArray(past) && past.length > 0 ? past[past.length - 1] : null;
    if (!latest) {
      return new Response(JSON.stringify({ message: 'Radar unavailable' }), {
        status: 500,
        headers: { 'content-type': 'application/json' },
      });
    }
    const timestamp = latest.time;
    const tileUrl = `https://tilecache.rainviewer.com/v2/radar/${timestamp}/256/{z}/{x}/{y}/2/1_1.png`;
    return new Response(
      JSON.stringify({ tileUrl, timestamp, latitude, longitude }),
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
