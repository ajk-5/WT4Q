export const metadata = {
  title: 'Global UV Index Today - The Nineties Times',
  description:
    'See today\'s UV index around the globe. Learn the risk levels from Low to Extreme.',
};

export default function UvIndexPage() {
  return (
    <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Global UV Index</h1>
      <p>Live world UV overview. Categories: Low, Moderate, High, Very High, Extreme.</p>
      <div style={{ aspectRatio: '16 / 9', width: '100%', border: 0 }}>
        <iframe
          title="World UV Index Map"
          src="https://embed.windy.com/embed2.html?lat=20&lon=0&detailLat=20&detailLon=0&width=100%25&height=100%25&zoom=3&level=surface&overlay=uvIndex&product=ecmwf&menu=&message=&marker=&calendar=&pressure=true&type=map&location=coordinates&detail=&metricWind=km%2Fh&metricTemp=%C2%B0C&radarRange=-1"
          style={{ width: '100%', height: '100%', border: 0 }}
          loading="lazy"
        />
      </div>
      <p style={{ fontSize: '0.875rem', color: '#666' }}>
        Source: Windy.com UV overlay (ECMWF). Values are indicative.
      </p>
    </div>
  );
}

