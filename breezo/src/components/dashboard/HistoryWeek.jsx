import styles from './HistoryWeek.module.css'

export default function HistoryWeek({ history }) {
  if (!history?.length) return null

  return (
    <section className={styles.panel}>
      <div className={styles.header}>
        <div>
          <div className={styles.kicker}>AQI history</div>
          <h3 className={styles.title}>Past 7 days</h3>
        </div>
        <div className={styles.meta}>Device-backed weekly trend</div>
      </div>

      <div className={styles.grid}>
        {history.map((item) => (
          <article className={styles.card} key={item.fullLabel}>
            <div className={styles.cardTop}>
              <span className={styles.day}>{item.label}</span>
              <span className={styles.date}>{item.fullLabel}</span>
            </div>

            <div className={styles.aqiBlock}>
              <div className={styles.aqiValue} style={{ color: item.info.color }}>
                {item.aqi}
              </div>
              <div className={styles.aqiLabel}>AQI</div>
              <div className={styles.status}>{item.info.label}</div>
            </div>

            <div className={styles.sensorGrid}>
              <div className={styles.sensorItem}>
                <span>Fine particle</span>
                <strong>{item.pm25.toFixed(1)}</strong>
              </div>
              <div className={styles.sensorItem}>
                <span>Temp</span>
                <strong>{item.temperature.toFixed(1)} C</strong>
              </div>
              <div className={styles.sensorItem}>
                <span>Humidity</span>
                <strong>{item.humidity.toFixed(1)} %</strong>
              </div>
              <div className={styles.sensorItem}>
                <span>CO2</span>
                <strong>{item.mq135.toFixed(1)}</strong>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
