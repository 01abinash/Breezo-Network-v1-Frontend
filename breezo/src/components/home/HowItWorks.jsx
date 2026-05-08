import { useScrollReveal } from '../../hooks/useScrollReveal'
import { RevealWrapper, SectionLabel, SectionTitle, SectionSubtitle } from '../ui/UI'
import styles from './HowItWorks.module.css'

const STEPS = [
  {
    num: '01',
    icon: 'Sensor',
    title: 'Deploy & Monitor',
    desc: 'Install BREEZO devices built around Fine particle, DHT22, CO2, and GPS modules for continuous local air monitoring.',
  },
  {
    num: '02',
    icon: 'Data',
    title: 'Transmit & Process',
    desc: 'Each ESP32 streams validated device telemetry to the BREEZO pipeline, where readings are normalized for the dashboard.',
  },
  {
    num: '03',
    icon: 'AQI',
    title: 'Analyze & Visualize',
    desc: 'Fine particle readings are converted into AQI, combined with temperature, humidity, and GPS context, then shown city by city.',
  },
  {
    num: '04',
    icon: 'Token',
    title: 'Earn & Expand',
    desc: 'Users will earn $BREEZO on Solana for verified uptime, coverage.',
  },
]

export default function HowItWorks() {
  const { ref, visible } = useScrollReveal()

  return (
    <section className={styles.section}>
      <div ref={ref}>
        <RevealWrapper visible={visible}>
          <div className={styles.header}>
            <SectionLabel>How It Works</SectionLabel>
            <SectionTitle>Four layers, one network.</SectionTitle>
            <SectionSubtitle>
              From rooftop hardware to token rewards on-chain, this is the complete BREEZO loop.
            </SectionSubtitle>
          </div>

          <div className={styles.stepsGrid}>
            {STEPS.map((step) => (
              <div className={styles.stepCard} key={step.num}>
                <span className={styles.stepNum}>{step.num}</span>
                <div className={styles.stepIcon}>{step.icon}</div>
                <h3 className={styles.stepTitle}>{step.title}</h3>
                <p className={styles.stepDesc}>{step.desc}</p>
              </div>
            ))}
          </div>
        </RevealWrapper>
      </div>
    </section>
  )
}
