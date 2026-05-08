import styles from './MetricsGrid.module.css'

const METRICS = [
  { key: 'pm25', label: 'Fine particle', unit: 'ug/m3', color: '#38BDF8', max: 150, note: 'Primary AQI input from your particulate sensor.' },
  { key: 'temperature', label: 'Temperature', unit: 'C', color: '#FB923C', max: 50, note: 'Ambient temperature from DHT22.' },
  { key: 'humidity', label: 'Humidity', unit: '% RH', color: '#2DD4BF', max: 100, note: 'Relative humidity from DHT22.' },
  { key: 'mq135', label: 'CO2', unit: 'raw/ppm', color: '#FCD34D', max: 1000, note: 'Gas sensor signal for your backend calibration logic.' },
]

function MetricCard({ metric, value }) {
  const pct = value != null ? Math.min(100, (value / metric.max) * 100) : 0

  return (
    <div className={styles.card}>
      <div className={styles.topRow}>
        <span className={styles.label}>{metric.label}</span>
      </div>
      <div className={styles.value}>
        {value != null ? parseFloat(value).toFixed(1) : 'Awaiting'}
      </div>
      <div className={styles.unit}>{metric.unit}</div>
      <div className={styles.barWrap}>
        <div
          className={styles.barFill}
          style={{ width: `${pct}%`, background: metric.color, transition: 'width 0.8s ease' }}
        />
      </div>
      <div className={styles.infoLine}>{metric.note}</div>
    </div>
  )
}

function formatGps(gps) {
  if (!gps?.lat || !gps?.lon) return null
  return `${gps.lat.toFixed(4)}, ${gps.lon.toFixed(4)}`
}

function InfoCard({ label, value, note }) {
  return (
    <div className={styles.card}>
      <div className={styles.topRow}>
        <span className={styles.label}>{label}</span>
      </div>
      <div className={`${styles.value} ${styles.valueCompact}`}>
        {value ?? 'Awaiting backend'}
      </div>
      <div className={styles.infoLine}>{note}</div>
    </div>
  )
}

export default function MetricsGrid({ data }) {
  const gpsNote =
    data?.gps?.source === 'Network average'
      ? 'Average position across the active Breezo device network.'
      : data?.gps?.source === 'City profile'
        ? 'Using fallback city coordinates until live GPS is connected.'
        : 'Live coordinates from the GPS module.'

  return (
    <div className={styles.panel}>
      <div className={styles.panelHeader}>Device Telemetry</div>
      <div className={styles.grid}>
        {METRICS.map((metric) => (
          <MetricCard key={metric.key} metric={metric} value={data?.[metric.key]} />
        ))}
        <InfoCard
          label="GPS"
          value={formatGps(data?.gps)}
          note={gpsNote}
        />
      </div>
    </div>
  )
}
