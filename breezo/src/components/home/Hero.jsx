import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLiveNodeAQI, useMultiCityAQI } from '../../hooks/useAirQuality'
import { getActiveDeviceCityKeys } from '../../lib/tokenizationApi'
import { Chip, LivePill } from '../ui/UI'
import styles from './Hero.module.css'

const CITY_LABELS = { ktm: 'Kathmandu', patan: 'Patan', jawa: 'Jawalakhel', del: 'Delhi' }

function formatHeroMetric(item) {
  if (item.type === 'gps') {
    if (!item.value?.lat || !item.value?.lon) return 'device feed'
    return `${item.value.lat.toFixed(2)}, ${item.value.lon.toFixed(2)}`
  }

  if (item.value == null || Number.isNaN(Number(item.value))) return 'device feed'
  return `${Number(item.value).toFixed(1)}${item.suffix ?? ''}`
}

function AQICell({ cityKey, data }) {
  const info = data?.info
  const cityLabel = data?.locationLabel ?? CITY_LABELS[cityKey] ?? cityKey.toUpperCase()

  return (
    <div className={styles.cityCell}>
      <div className={styles.cityName}>{cityLabel}</div>
      {data ? (
        <>
          <div className={styles.cityAQI} style={{ color: info.color }}>
            {data.aqi}
          </div>
          <span className={styles.aqiPill} style={{ background: info.bgColor, color: info.color, border: `1px solid ${info.borderColor}` }}>
            {info.label.split(' ')[0]}
          </span>
        </>
      ) : (
        <div className={styles.cityAQI} style={{ color: 'var(--t3)' }}>--</div>
      )}
    </div>
  )
}

function NetworkCanvas() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    let raf

    const nodes = [
      { label: 'Fine particle', r: 80, angle: 0.3, speed: 0.0008 },
      { label: 'DHT22', r: 80, angle: 1.8, speed: 0.0008 },
      { label: 'CO2', r: 120, angle: 0.9, speed: 0.0005 },
      { label: 'GPS', r: 100, angle: 3.5, speed: 0.0007 },
      { label: 'API', r: 90, angle: 5.8, speed: 0.0009 },
    ]

    let tick = 0
    function draw() {
      const w = canvas.width
      const h = canvas.height
      const cx = w / 2
      const cy = h / 2
      ctx.clearRect(0, 0, w, h)

      ctx.strokeStyle = 'rgba(56,189,248,0.07)'
      ctx.lineWidth = 1
      ;[60, 100, 140].forEach((radius) => {
        ctx.beginPath()
        ctx.arc(cx, cy, radius, 0, Math.PI * 2)
        ctx.stroke()
      })

      nodes.forEach((node) => {
        const angle = node.angle + tick * node.speed
        const x = cx + Math.cos(angle) * node.r
        const y = cy + Math.sin(angle) * node.r

        ctx.setLineDash([3, 6])
        ctx.strokeStyle = 'rgba(56,189,248,0.2)'
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(cx, cy)
        ctx.lineTo(x, y)
        ctx.stroke()
        ctx.setLineDash([])

        ctx.beginPath()
        ctx.arc(x, y, 13, 0, Math.PI * 2)
        ctx.fillStyle = 'rgba(56,189,248,0.1)'
        ctx.fill()
        ctx.strokeStyle = 'rgba(56,189,248,0.45)'
        ctx.lineWidth = 1.5
        ctx.stroke()

        ctx.fillStyle = 'rgba(56,189,248,0.85)'
        ctx.font = 'bold 7px DM Mono, monospace'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(node.label, x, y)
      })

      ctx.beginPath()
      ctx.arc(cx, cy, 20, 0, Math.PI * 2)
      ctx.fillStyle = 'rgba(56,189,248,0.14)'
      ctx.fill()
      ctx.strokeStyle = 'rgba(56,189,248,0.65)'
      ctx.lineWidth = 2
      ctx.stroke()
      ctx.fillStyle = 'rgba(56,189,248,0.9)'
      ctx.font = 'bold 7px DM Mono, monospace'
      ctx.fillText('BREEZO', cx, cy)

      tick += 1
      raf = requestAnimationFrame(draw)
    }

    const resize = () => {
      canvas.width = canvas.offsetWidth
      canvas.height = canvas.offsetHeight
    }

    resize()
    draw()

    window.addEventListener('resize', resize)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return <canvas ref={canvasRef} className={styles.networkCanvas} />
}

export default function Hero() {
  const navigate = useNavigate()
  const fallbackHeroCities = getActiveDeviceCityKeys()
  const liveNodes = useLiveNodeAQI()
  const heroCities = liveNodes.length ? [] : fallbackHeroCities
  const cityData = useMultiCityAQI(heroCities)
  const heroItems = liveNodes.length
    ? liveNodes.map((node) => ({ key: node.key, data: node }))
    : heroCities.map((key) => ({ key, data: cityData[key] }))
  const leadCity = heroItems.find((item) => item.data)?.data

  return (
    <section className={styles.hero}>
      <div className={styles.heroBg} />
      <div className={styles.heroGrid} />

      <div className={`${styles.heroContent} fade-up d1`}>
        <Chip>DePIN · Air Quality · Solana</Chip>
        <h1 className={styles.h1}>
          Turning
          <br />
          <span className={styles.skyText}>invisible air</span>
          <br />
          <span className={styles.dimText}>into visible truth.</span>
        </h1>
        <p className={styles.heroP}>
          BREEZO Network is a decentralized air quality monitoring infrastructure powered by our own AQI devices.
          Live readings. Real cities. Token-incentivized contributors. Built for South Asia.
        </p>
        <div className={styles.heroBtns}>
          <button className={styles.btnSky} onClick={() => navigate('/dashboard')}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="3" fill="currentColor" />
              <path d="M8 1.5v1M8 13.5v1M1.5 8h1M13.5 8h1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            Live Dashboard
          </button>
          <button className={styles.btnGhost} onClick={() => navigate('/tokenization')}>
            Login {'->'}
          </button>
        </div>
      </div>

      <div className={`${styles.aqiPanel} fade-up d4`}>
        <div className={styles.aqiCard}>
          <div className={styles.aqiCardHeader}>
            <span className={styles.aqiCardTitle}>BREEZO Device Network · Live</span>
            {/* <LivePill /> */}
          </div>

          <div className={styles.cityGrid}>
            {heroItems.map(({ key, data }) => (
              <AQICell key={key} cityKey={key} data={data} />
            ))}
          </div>

          <div className={styles.pollutantBar}>
            {[
              { label: 'Fine particle', value: leadCity?.pm25 },
              { label: 'AQI', value: leadCity?.aqi },
              { label: 'Temperature', value: leadCity?.temperature, suffix: 'C' },
              { label: 'Humidity', value: leadCity?.humidity, suffix: '%' },
              { label: 'CO2', value: leadCity?.mq135 },
              { label: 'GPS', value: leadCity?.gps, type: 'gps' },
            ].map((item) => (
              <div className={styles.pChip} key={item.label}>
                <span className={styles.pVal}>{formatHeroMetric(item)}</span>
                <span className={styles.pName}>{item.label}</span>
              </div>
            ))}
          </div>

          <div className={styles.networkViz}>
            <NetworkCanvas />
          </div>
        </div>
      </div>
    </section>
  )
}
