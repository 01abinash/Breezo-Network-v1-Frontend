import { useEffect, useRef } from 'react'
import { useScrollReveal } from '../../hooks/useScrollReveal'
import { RevealWrapper, SectionLabel, SectionTitle, SectionSubtitle, MonoTag } from '../ui/UI'
import styles from './DepinSection.module.css'

const LAYERS = [
  {
    step: 'LAYER 01 · DEVICE',
    icon: 'Sensor',
    title: 'IoT Sensor Nodes',
    desc: 'BREEZO devices combine ESP32, Fine particle, DHT22, CO2, and GPS modules for hyperlocal air monitoring.',
    tags: ['Fine particle', 'DHT22', 'CO2', 'GPS'],
  },
  {
    step: 'LAYER 02 · DATA',
    icon: 'Data',
    title: 'Real-Time Data Pipeline',
    desc: 'Raw sensor data is aggregated, validated, and structured in real time. Visualized on an interactive dashboard, accessible via REST API to developers, researchers, and policymakers.',
    tags: ['LIVE FEED', 'REST API', 'STREET-LEVEL', 'OPEN DATA'],
  },
  {
    step: 'LAYER 03 · INCENTIVE',
    icon: 'Token',
    title: 'Token Rewards on Solana',
    desc: 'Contributors earn $BREEZO tokens for hosting nodes. Rewards scale with uptime, data quality, and network coverage. Transparent, programmatic, and fully verifiable on-chain.',
    tags: ['SOLANA', '$BREEZO', 'DEPIN', 'ON-CHAIN'],
  },
]

const WHY_NOW = [
  'Affordable IoT hardware is finally accessible',
  'Solana enables low-cost, high-throughput rewards',
  "South Asia's pollution crisis demands urgency",
  'DePIN has proven community-owned infrastructure works',
]

function TokenOrbit() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    let raf

    const orbits = [
      { radius: 60, speed: 0.012, nodeLabel: 'S1', nodeColor: '#2DD4BF', startAngle: 0 },
      { radius: 95, speed: 0.007, nodeLabel: 'S2', nodeColor: '#38BDF8', startAngle: 2.1 },
      { radius: 95, speed: 0.007, nodeLabel: 'S5', nodeColor: '#38BDF8', startAngle: 5.2 },
      { radius: 130, speed: 0.004, nodeLabel: 'S3', nodeColor: '#A78BFA', startAngle: 1.0 },
      { radius: 130, speed: 0.004, nodeLabel: 'S6', nodeColor: '#A78BFA', startAngle: 3.2 },
      { radius: 130, speed: 0.004, nodeLabel: 'S9', nodeColor: '#A78BFA', startAngle: 5.0 },
    ]

    let tick = 0
    function draw() {
      const width = canvas.width
      const height = canvas.height
      const cx = width / 2
      const cy = height / 2
      ctx.clearRect(0, 0, width, height)

      ;[60, 95, 130].forEach((radius) => {
        ctx.beginPath()
        ctx.arc(cx, cy, radius, 0, Math.PI * 2)
        ctx.strokeStyle = 'rgba(56,189,248,0.08)'
        ctx.setLineDash([4, 8])
        ctx.lineWidth = 1
        ctx.stroke()
        ctx.setLineDash([])
      })

      orbits.forEach((orbit) => {
        const angle = orbit.startAngle + tick * orbit.speed
        const x = cx + Math.cos(angle) * orbit.radius
        const y = cy + Math.sin(angle) * orbit.radius

        ctx.beginPath()
        ctx.moveTo(cx, cy)
        ctx.lineTo(x, y)
        ctx.strokeStyle = 'rgba(56,189,248,0.1)'
        ctx.lineWidth = 1
        ctx.setLineDash([2, 6])
        ctx.stroke()
        ctx.setLineDash([])

        ctx.beginPath()
        ctx.arc(x, y, 12, 0, Math.PI * 2)
        ctx.fillStyle = `${orbit.nodeColor}22`
        ctx.fill()
        ctx.strokeStyle = `${orbit.nodeColor}AA`
        ctx.lineWidth = 1.5
        ctx.stroke()
        ctx.fillStyle = `${orbit.nodeColor}CC`
        ctx.font = 'bold 7px DM Mono, monospace'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(orbit.nodeLabel, x, y)
      })

      ctx.beginPath()
      ctx.arc(cx, cy, 24, 0, Math.PI * 2)
      ctx.fillStyle = 'rgba(56,189,248,0.14)'
      ctx.fill()
      ctx.strokeStyle = 'rgba(56,189,248,0.6)'
      ctx.lineWidth = 2
      ctx.stroke()
      ctx.fillStyle = 'rgba(56,189,248,0.9)'
      ctx.font = 'bold 7.5px DM Mono, monospace'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('BREEZO', cx, cy - 5)
      ctx.fillText('CHAIN', cx, cy + 6)

      tick += 1
      raf = requestAnimationFrame(draw)
    }

    const resize = () => {
      canvas.width = canvas.offsetWidth
      canvas.height = canvas.offsetHeight
    }

    resize()
    draw()

    const observer = new ResizeObserver(resize)
    observer.observe(canvas)

    return () => {
      cancelAnimationFrame(raf)
      observer.disconnect()
    }
  }, [])

  return (
    <div className={styles.orbitWrap}>
      <canvas ref={canvasRef} className={styles.orbitCanvas} />
      <p className={styles.orbitCaption}>Sensor nodes orbiting the BREEZO on-chain core</p>
    </div>
  )
}

export default function DepinSection() {
  const { ref, visible } = useScrollReveal()

  return (
    <section className={styles.section} id="depin">
      <div className={styles.sectionHeader}>
        <SectionLabel>Decentralized Physical Infrastructure</SectionLabel>
        <SectionTitle center>How the BREEZO Network works.</SectionTitle>
        <SectionSubtitle center>
          Three interlocking layers - devices, data, and decentralized incentives - creating a
          self-sustaining environmental intelligence network.
        </SectionSubtitle>
      </div>

      <RevealWrapper visible={visible}>
        <div ref={ref} className={styles.layerGrid}>
          {LAYERS.map((layer) => (
            <div className={styles.layerCard} key={layer.step}>
              <div className={styles.layerStep}>{layer.step}</div>
              <span className={styles.layerIcon}>{layer.icon}</span>
              <h3 className={styles.layerTitle}>{layer.title}</h3>
              <p className={styles.layerDesc}>{layer.desc}</p>
              <div className={styles.layerTags}>
                {layer.tags.map((tag) => <MonoTag key={tag}>{tag}</MonoTag>)}
              </div>
            </div>
          ))}
        </div>
      </RevealWrapper>

      {/* <RevealWrapper visible={visible} className={styles.bottomGrid}>
        <div className={styles.bottomGrid}>
          <TokenOrbit />

          <div className={styles.rightPanel}>
            <div className={styles.rewardFormula}>
              <div className={styles.formulaLabel}>Reward Formula</div>
              <div className={styles.formulaCode}>
                $BREEZO = f(uptime) x f(quality) x f(coverage)
              </div>
            </div>

            <div className={styles.whyNow}>
              <div className={styles.formulaLabel}>Why Now</div>
              {WHY_NOW.map((reason) => (
                <div className={styles.whyRow} key={reason}>
                  <span className={styles.greenDot} />
                  <span>{reason}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </RevealWrapper> */}
    </section>
  )
}
