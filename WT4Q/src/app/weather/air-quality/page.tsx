export const metadata = {
  title: 'Global Air Quality Index (AQI) - The Nineties Times',
  description:
    'Explore today\'s air quality around the world. Live AQI map from Good to Hazardous.',
};

export default function AirQualityPage() {
  return (
    <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Global Air Quality Index</h1>
      <p>Live world AQI overview. Values are categorized from Good to Hazardous.</p>
      <div style={{ aspectRatio: '16 / 9', width: '100%', border: 0 }}>
        <iframe
          title="World AQI Map"
          src="https://aqicn.org/map/world/"
          style={{ width: '100%', height: '100%', border: 0 }}
          loading="lazy"
        />
      </div>
      <p style={{ fontSize: '0.875rem', color: '#666' }}>
        Source: World Air Quality Index Project (aqicn.org)
      </p>
    </div>
  );
}

