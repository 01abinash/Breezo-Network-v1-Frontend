import { useEffect, useRef } from 'react'
import { SectionLabel, SectionTitle, SectionSubtitle, MonoTag } from '../components/ui/UI'
import { useScrollReveal } from '../hooks/useScrollReveal'
import styles from './NetworkPage.module.css'

const SENSOR_SPECS = [
  { param: 'Fine particle',    method: 'Laser scattering',     range: '0–999 μg/m³',   accuracy: '±10%' },
  { param: 'CO₂',              method: 'NDIR optical',         range: '400–5000 ppm',  accuracy: '±50 ppm' },
  { param: 'NO₂',              method: 'Electrochemical',      range: '0–10 ppm',      accuracy: '±5%' },
  { param: 'Temperature',      method: 'Thermistor (SHT31)',   range: '-40–85°C',      accuracy: '±0.3°C' },
  { param: 'Humidity',         method: 'Capacitive (SHT31)',   range: '0–100% RH',     accuracy: '±2% RH' },
]

const REWARD_TIERS = [
  { tier: 'Bronze',   uptime: '70–85%',  quality: 'Standard',  multiplier: '0.7×',  color: '#CD7F32' },
  { tier: 'Silver',   uptime: '85–95%',  quality: 'Good',       multiplier: '1.0×',  color: '#94A3B8' },
  { tier: 'Gold',     uptime: '95–99%',  quality: 'High',       multiplier: '1.4×',  color: '#FCD34D' },
  { tier: 'Platinum', uptime: '99–100%', quality: 'Excellent',  multiplier: '2.0×',  color: '#38BDF8' },
]

const ROADMAP = [
  { phase: 'Phase 1', label: 'Foundation',   status: 'active',   items: ['Kathmandu pilot deployment', '20 sensor nodes live', 'Dashboard v1 launched', 'Data API (beta)'] },
  { phase: 'Phase 2', label: 'Tokenization', status: 'upcoming', items: ['$BREEZO token launch on Solana', 'Reward distribution smart contracts', 'Node operator dashboard', 'Testnet incentives'] },
  { phase: 'Phase 3', label: 'Expansion',    status: 'planned',  items: ['Delhi, Mumbai, Lahore rollout', '500+ nodes deployed', 'Mobile app with alerts', 'Government data partnerships'] },
  { phase: 'Phase 4', label: 'Intelligence', status: 'planned',  items: ['AI-powered 7-day forecasts', 'On-chain data validation', 'Smart city API integrations', 'Regional DePIN standard'] },
]

function RevealSection({ children, className = '' }) {
  const { ref, visible } = useScrollReveal()
  return (
    <div
      ref={ref}
      className={`${styles.reveal} ${visible ? styles.visible : ''} ${className}`}
    >
      {children}
    </div>
  )
}

function LiveNetworkViz() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    let raf

    const nodes = [
      // Core
      { x: 0.5,  y: 0.5,  r: 0,    label: 'CORE',  color: '#38BDF8', size: 22, ring: true },
      // Ring 1 — data collectors
      { x: 0.5,  y: 0.2,  r: 1, label: 'KTM-01', color: '#2DD4BF', size: 14 },
      { x: 0.78, y: 0.32, r: 1, label: 'KTM-02', color: '#2DD4BF', size: 14 },
      { x: 0.8,  y: 0.65, r: 1, label: 'KTM-03', color: '#2DD4BF', size: 14 },
      { x: 0.5,  y: 0.8,  r: 1, label: 'PKR-01', color: '#2DD4BF', size: 14 },
      { x: 0.22, y: 0.65, r: 1, label: 'DEL-01', color: '#2DD4BF', size: 14 },
      { x: 0.2,  y: 0.32, r: 1, label: 'MUM-01', color: '#2DD4BF', size: 14 },
      // Ring 2 — extended
      { x: 0.5,  y: 0.06, r: 2, label: 'S08', color: '#A78BFA', size: 11 },
      { x: 0.68, y: 0.1,  r: 2, label: 'S09', color: '#A78BFA', size: 11 },
      { x: 0.88, y: 0.22, r: 2, label: 'S10', color: '#A78BFA', size: 11 },
      { x: 0.94, y: 0.5,  r: 2, label: 'S11', color: '#A78BFA', size: 11 },
      { x: 0.88, y: 0.78, r: 2, label: 'S12', color: '#A78BFA', size: 11 },
      { x: 0.68, y: 0.9,  r: 2, label: 'S13', color: '#A78BFA', size: 11 },
      { x: 0.32, y: 0.9,  r: 2, label: 'S14', color: '#A78BFA', size: 11 },
      { x: 0.12, y: 0.78, r: 2, label: 'S15', color: '#A78BFA', size: 11 },
      { x: 0.06, y: 0.5,  r: 2, label: 'S16', color: '#A78BFA', size: 11 },
      { x: 0.12, y: 0.22, r: 2, label: 'S17', color: '#A78BFA', size: 11 },
      { x: 0.32, y: 0.1,  r: 2, label: 'S18', color: '#A78BFA', size: 11 },
    ]

    // Animate nodes in ring 1 orbiting slightly
    const baseAngles = nodes.slice(1, 7).map((n, i) => i * (Math.PI * 2 / 6))
    const ring1Radius = 0.28
    let tick = 0

    function draw() {
      const W = canvas.width, H = canvas.height
      ctx.clearRect(0, 0, W, H)

      // Update ring-1 positions
      nodes.slice(1, 7).forEach((n, i) => {
        const a = baseAngles[i] + tick * 0.0004
        n.x = 0.5 + Math.cos(a) * ring1Radius
        n.y = 0.5 + Math.sin(a) * (ring1Radius * (H / W)) // aspect ratio
      })

      // Draw connections from each node to core
      const cx = 0.5 * W, cy = 0.5 * H
      nodes.slice(1).forEach((n) => {
        const nx = n.x * W, ny = n.y * H
        const alpha = n.r === 1 ? 0.18 : 0.08
        ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(nx, ny)
        ctx.strokeStyle = `rgba(56,189,248,${alpha})`
        ctx.lineWidth = n.r === 1 ? 1 : 0.5
        ctx.setLineDash(n.r === 2 ? [3, 7] : [])
        ctx.stroke(); ctx.setLineDash([])
      })

      // Draw nodes
      nodes.forEach((n) => {
        const nx = n.x * W, ny = n.y * H
        if (n.ring) {
          // Pulsing ring for core
          const pulse = 1 + 0.15 * Math.sin(tick * 0.06)
          ctx.beginPath(); ctx.arc(nx, ny, n.size * 1.8 * pulse, 0, Math.PI * 2)
          ctx.strokeStyle = `rgba(56,189,248,${0.08 + 0.04 * Math.sin(tick * 0.06)})`
          ctx.lineWidth = 1; ctx.stroke()
          ctx.beginPath(); ctx.arc(nx, ny, n.size * 1.3, 0, Math.PI * 2)
          ctx.strokeStyle = 'rgba(56,189,248,0.2)'; ctx.lineWidth = 1; ctx.stroke()
        }
        ctx.beginPath(); ctx.arc(nx, ny, n.size, 0, Math.PI * 2)
        ctx.fillStyle = n.color + (n.r === 0 ? '28' : '18')
        ctx.fill()
        ctx.strokeStyle = n.color + (n.r === 0 ? 'CC' : n.r === 1 ? '99' : '66')
        ctx.lineWidth = n.r === 0 ? 2 : 1.5
        ctx.stroke()

        ctx.fillStyle = n.color + (n.r === 0 ? 'FF' : n.r === 1 ? 'CC' : '99')
        ctx.font = `bold ${n.r === 0 ? 7.5 : n.r === 1 ? 6.5 : 5.5}px DM Mono,monospace`
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
        ctx.fillText(n.label, nx, ny)
      })

      tick++
      raf = requestAnimationFrame(draw)
    }

    const resize = () => { canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight }
    resize()
    draw()

    const ro = new ResizeObserver(resize)
    ro.observe(canvas)
    return () => { cancelAnimationFrame(raf); ro.disconnect() }
  }, [])

  return <canvas ref={canvasRef} className={styles.networkCanvas} />
}

export default function NetworkPage() {
  return (
    <div className={styles.page}>

      {/* Hero */}
      <section className={styles.hero}>
        <div className={styles.heroBg} />
        <div className={`${styles.heroContent} fade-up d1`}>
          <SectionLabel>The BREEZO Device Layer</SectionLabel>
          <h1 className={styles.heroTitle}>
            A community-powered<br />
            <span className={styles.sky}>sensor network.</span>
          </h1>
          <p className={styles.heroDesc}>
            Low-cost IoT nodes deployed across urban areas, continuously measuring air quality,
            transmitting to a real-time processing pipeline, and rewarding contributors on Solana.
          </p>
          <div className={styles.heroStats}>
            {[
              { num: '18+',  label: 'Nodes live' },
              { num: '6',    label: 'Cities' },
              { num: '93%',  label: 'Data accuracy' },
              { num: '< 1m', label: 'Latency' },
            ].map(s => (
              <div className={styles.heroStat} key={s.label}>
                <span className={styles.heroStatNum}>{s.num}</span>
                <span className={styles.heroStatLabel}>{s.label}</span>
              </div>
            ))}
          </div>
        </div>
        <div className={`${styles.heroViz} fade-up d3`}>
          <LiveNetworkViz />
          <div className={styles.vizLegend}>
            <span className={styles.vizDot} style={{ background: '#38BDF8' }} />
            <span>Core</span>
            <span className={styles.vizDot} style={{ background: '#2DD4BF', marginLeft: 12 }} />
            <span>City nodes</span>
            <span className={styles.vizDot} style={{ background: '#A78BFA', marginLeft: 12 }} />
            <span>Sensor nodes</span>
          </div>
        </div>
      </section>

      {/* Sensor specs */}
      <RevealSection>
        <section className={styles.section}>
          <SectionLabel>Hardware Specifications</SectionLabel>
          <SectionTitle>What each node measures.</SectionTitle>
          <SectionSubtitle>
            Every BREEZO sensor node is equipped with seven measurement channels, transmitting
            continuously via WiFi or 4G.
          </SectionSubtitle>
          <div className={styles.specsTable}>
            <div className={styles.specsHeader}>
              <span>Parameter</span><span>Method</span><span>Range</span><span>Accuracy</span>
            </div>
            {SENSOR_SPECS.map(s => (
              <div className={styles.specsRow} key={s.param}>
                <span className={styles.specParam}>{s.param}</span>
                <span className={styles.specMethod}>{s.method}</span>
                <span className={styles.specRange}>{s.range}</span>
                <span className={styles.specAccuracy}>{s.accuracy}</span>
              </div>
            ))}
          </div>
        </section>
      </RevealSection>

      {/* Reward tiers */}
      <RevealSection>
        <section className={`${styles.section} ${styles.darkSection}`}>
          <SectionLabel>Token Incentives</SectionLabel>
          <SectionTitle>Earn $BREEZO for good data.</SectionTitle>
          <SectionSubtitle>
            Node operators are rewarded based on uptime, data quality, and geographic coverage.
            Better performance means higher multipliers.
          </SectionSubtitle>
          <div className={styles.tiersGrid}>
            {REWARD_TIERS.map(t => (
              <div className={styles.tierCard} key={t.tier} style={{ borderColor: t.color + '44' }}>
                <div className={styles.tierBadge} style={{ background: t.color + '22', color: t.color, borderColor: t.color + '55' }}>
                  {t.tier}
                </div>
                <div className={styles.tierMult} style={{ color: t.color }}>{t.multiplier}</div>
                <div className={styles.tierMultLabel}>reward multiplier</div>
                <div className={styles.tierDivider} />
                <div className={styles.tierRow}>
                  <span className={styles.tierKey}>Uptime</span>
                  <span className={styles.tierVal}>{t.uptime}</span>
                </div>
                <div className={styles.tierRow}>
                  <span className={styles.tierKey}>Data quality</span>
                  <span className={styles.tierVal}>{t.quality}</span>
                </div>
              </div>
            ))}
          </div>
          <div className={styles.formulaBox}>
            <span className={styles.formulaLabel}>On-chain reward formula</span>
            <code className={styles.formulaCode}>$BREEZO = BASE_RATE × f(uptime) × f(quality) × f(coverage_bonus)</code>
          </div>
        </section>
      </RevealSection>

      {/* Roadmap */}
      <RevealSection>
        <section className={styles.section}>
          <SectionLabel>Roadmap</SectionLabel>
          <SectionTitle>Where we're going.</SectionTitle>
          <div className={styles.roadmapGrid}>
            {ROADMAP.map((phase, i) => (
              <div
                className={`${styles.roadmapCard} ${phase.status === 'active' ? styles.roadmapActive : ''}`}
                key={phase.phase}
              >
                <div className={styles.roadmapPhase}>
                  <span className={styles.roadmapPhaseLabel}>{phase.phase}</span>
                  <span className={`${styles.roadmapStatus} ${styles[`status_${phase.status}`]}`}>
                    {phase.status}
                  </span>
                </div>
                <div className={styles.roadmapTitle}>{phase.label}</div>
                <ul className={styles.roadmapItems}>
                  {phase.items.map(item => (
                    <li className={styles.roadmapItem} key={item}>
                      <span className={styles.roadmapDot}
                        style={{ background: phase.status === 'active' ? '#38BDF8' : phase.status === 'upcoming' ? '#FCD34D' : '#475569' }}
                      />
                      {item}
                    </li>
                  ))}
                </ul>
                {i < ROADMAP.length - 1 && <div className={styles.roadmapConnector} />}
              </div>
            ))}
          </div>
        </section>
      </RevealSection>

    </div>
  )
}
