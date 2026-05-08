import { useState } from 'react'
import { getAQIInfo } from '../lib/aqi'
import { getActiveDeviceCityKeys } from '../lib/tokenizationApi'
import { useAirQuality, useMultiCityAQI } from '../hooks/useAirQuality'
import { LivePill } from '../components/ui/UI'
import AQIHeroCard from '../components/dashboard/AQIHeroCard'
import MetricsGrid from '../components/dashboard/MetricsGrid'
import TrendChart from '../components/dashboard/TrendChart'
import HistoryWeek from '../components/dashboard/HistoryWeek'
import WHOBars from '../components/dashboard/WHOBars'
import LiveMap from '../components/dashboard/LiveMap'
import HealthCards from '../components/dashboard/HealthCards'
import CityCompareChart from '../components/dashboard/CityCompareChart'
import styles from './DashboardPage.module.css'

export default function DashboardPage() {
  const activeCities = getActiveDeviceCityKeys()
  const [activeCity, setActiveCity] = useState(activeCities[0] ?? 'ktm')
  const { data, loading, error, refetch } = useAirQuality(activeCity)
  const networkCityData = useMultiCityAQI(activeCities)

  const now = new Date()
  const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  const dateStr = now.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })
  const networkEntries = activeCities
    .map((key) => networkCityData[key])
    .filter(Boolean)

  const averageNetworkData = networkEntries.length
    ? (() => {
        const average = (key) =>
          networkEntries.reduce((sum, item) => sum + (item[key] ?? 0), 0) / networkEntries.length

        const avgAqi = Math.round(
          average('aqi')
        )
        const avgPm25 = average('pm25')
        const avgTemperature = average('temperature')
        const avgHumidity = average('humidity')
        const avgMq135 = average('mq135')
        const avgLat =
          networkEntries.reduce((sum, item) => sum + (item.gps?.lat ?? 0), 0) / networkEntries.length
        const avgLon =
          networkEntries.reduce((sum, item) => sum + (item.gps?.lon ?? 0), 0) / networkEntries.length

        return {
          aqi: avgAqi,
          pm25: avgPm25,
          temperature: avgTemperature,
          humidity: avgHumidity,
          mq135: avgMq135,
          gps: {
            lat: avgLat,
            lon: avgLon,
            source: 'Network average',
          },
          sourceLabel: `Average across ${networkEntries.length} Breezo devices`,
          info: getAQIInfo(avgAqi),
        }
      })()
    : data

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div className={styles.headerLeft}>
          <h1 className={styles.pageTitle}>Air Quality Dashboard</h1>
          <div className={styles.pageMeta}>
            <LivePill />
            <span className={styles.metaText}>
              {dateStr} · {timeStr} · BREEZO Network v1.0
            </span>
            {/* {data?.sourceLabel && <span className={styles.metaText}>{data.sourceLabel}</span>}
            {error && <span className={styles.errorBadge}>Device feed unavailable right now</span>} */}
          </div>
        </div>
        <button className={styles.refreshBtn} onClick={refetch} disabled={loading}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <path d="M12 7A5 5 0 1 1 7 2M7 2l2.5 2.5M7 2L4.5 4.5" />
          </svg>
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      <div className={styles.mainGrid}>
        <AQIHeroCard cityName="BREEZO Network Average" data={averageNetworkData} loading={loading && !averageNetworkData} />
        <MetricsGrid data={averageNetworkData} />
      </div>

      <div className={styles.quickRef}>
        <div className={styles.qrHeaderRow}>
          <div>
            <div className={styles.qrHeader}>AQI Quick Reference</div>
            <div className={styles.qrSub}>How BREEZO classifies live air quality at a glance</div>
          </div>
        </div>
        <div className={styles.qrGrid}>
          {[
            { range: '0 - 50', label: 'Good', color: '#4ADE80' },
            { range: '51 - 100', label: 'Moderate', color: '#FCD34D' },
            { range: '101 - 150', label: 'Unhealthy for Sensitive', color: '#FB923C' },
            { range: '151 - 200', label: 'Unhealthy', color: '#F87171' },
            { range: '201 - 300', label: 'Very Unhealthy', color: '#E879F9' },
            { range: '301+', label: 'Hazardous', color: '#F87171' },
          ].map((item) => (
            <div className={styles.qrItem} key={item.range}>
              <span className={styles.qrDot} style={{ background: item.color }} />
              <div className={styles.qrItemBody}>
                <div className={styles.qrRange} style={{ color: item.color }}>{item.range}</div>
                <div className={styles.qrLabel}>{item.label}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* <WHOBars data={data} /> */}
      {/* <TrendChart trend={data?.trend} /> */}
      <HistoryWeek history={data?.history} />
      <LiveMap activeCity={activeCity} />
      <HealthCards data={data} />
      <CityCompareChart />
    </div>
  )
}
