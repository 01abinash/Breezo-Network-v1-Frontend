import { useEffect, useState } from 'react'
import L from 'leaflet'
import {
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  ZoomControl,
  useMap,
} from 'react-leaflet'
import 'leaflet/dist/leaflet.css'

import { fetchMapNodes } from '../../services/map.service'
import { socket } from '../../sockets/socket.client'
import { CITIES } from '../../lib/aqi'
import { resolveLocationName } from '../../services/location.service'

import styles from './LiveMap.module.css'

const DEFAULT_CENTER = [27.7007, 85.3001]

function distanceSquared(aLat, aLon, bLat, bLon) {
  return ((aLat ?? 0) - (bLat ?? 0)) ** 2 + ((aLon ?? 0) - (bLon ?? 0)) ** 2
}

function getFallbackLocationLabel(lat, lon, nodeId) {
  if (lat == null || lon == null) return null

  let bestLabel = null
  let bestDistance = Infinity

  Object.values(CITIES).forEach((city) => {
    const nextDistance = distanceSquared(lat, lon, city.lat, city.lon)
    if (nextDistance < bestDistance) {
      bestDistance = nextDistance
      bestLabel = city.label
    }
  })

  return bestLabel ?? nodeId ?? 'Unknown node'
}

// 🎨 AQI COLOR
function getMarkerColor(aqi) {
  if (aqi <= 50) return '#4ADE80'
  if (aqi <= 100) return '#FCD34D'
  if (aqi <= 150) return '#FB923C'
  if (aqi <= 200) return '#F87171'
  if (aqi <= 300) return '#E879F9'
  return '#EF4444'
}

// 🧠 MAP TRANSFORM
async function mapNodeToDevice(node) {
  const lat = node.lat ?? node.location?.lat
  const lng = node.lng ?? node.location?.lng
  const fallbackLocationLabel = getFallbackLocationLabel(lat, lng, node.nodeId)
  const locationLabel = await resolveLocationName(lat, lng, fallbackLocationLabel)

  return {
    cityKey: node.nodeId,
    cityLabel: locationLabel ?? node.nodeId,
    nodeId: node.nodeId,

    coords: [lat, lng],

    aqi: node.aqi,
    status: node.aqiLevel,
    color: getMarkerColor(node.aqi),

    connectivity: 'online',
    lastSeen: 'just now',

    telemetry: {
      pm25: node.pm25,
      temperature: node.temperature,
      humidity: node.humidity || 0,
      mq135: 0,
    },
  }
}



// 🎯 MARKER
function createMarkerIcon(color, isActive) {
  const size = isActive ? 22 : 18
  const halo = isActive ? 10 : 6

  return L.divIcon({
    className: '',
    html: `
      <div
        class="mapMarkerDot ${isActive ? 'mapMarkerDotSelected' : ''}"
        style="
          --marker-size:${size}px;
          --marker-color:${color};
          --marker-halo:${halo}px;
        "
      ></div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  })
}

// 🗺️ FIT MAP
function FitMapToDevices({ selectedCoords }) {
  const map = useMap()
  const [isFirstLoad, setIsFirstLoad] = useState(true)

  useEffect(() => {
    // 1. ON FIRST LOAD: Always force Kathmandu, even if data exists
    if (isFirstLoad) {
      map.setView(DEFAULT_CENTER, 11)
      setIsFirstLoad(false)
      return
    }

    // 2. ON SELECTION: Only move if you click a marker or sidebar item
    if (selectedCoords) {
      map.flyTo(selectedCoords, 13, {
        animate: true,
        duration: 0.8,
      })
    }

    // IMPORTANT: We deleted map.fitBounds() entirely.
    // This stops it from ever trying to show Delhi and KTM at the same time.
  }, [map, selectedCoords, isFirstLoad])

  return null
}

// 🚀 MAIN COMPONENT
export default function LiveMap({ mode = 'panel' }) {
  const [devices, setDevices] = useState([])
  const [selectedCityKey, setSelectedCityKey] = useState(null)

  // 🌐 INITIAL LOAD
  useEffect(() => {
    const load = async () => {
      const res = await fetchMapNodes()
      const mapped = await Promise.all(res.map(mapNodeToDevice))

      setDevices(mapped)

      if (mapped.length) {
        setSelectedCityKey(mapped[0].cityKey)
      }
    }

    load()
  }, [])

  // 🔌 SOCKET LIVE UPDATE
  useEffect(() => {
    socket.connect()

    socket.on('node:update', async (node) => {
      const updated = await mapNodeToDevice(node)

      setDevices((prev) => {
        const idx = prev.findIndex((d) => d.cityKey === updated.cityKey)

        if (idx !== -1) {
          const copy = [...prev]
          copy[idx] = updated
          return copy
        }

        return [...prev, updated]
      })
    })

    return () => socket.off('node:update')
  }, [])

  const selectedDevice =
    devices.find((d) => d.cityKey === selectedCityKey) || devices[0]

  const isPageMode = mode === 'page'

  return (
    <section className={`${styles.panel} ${mode === 'page' ? styles.panelPage : ''}`}>
      {/* Header Section */}
      {mode !== 'page' && (
        <div className={styles.header}>
          <div>
            <div className={styles.kicker}>Device network map</div>
            <h3 className={styles.title}>Live device operations view</h3>
          </div>
          <div className={styles.legend}>
            <span className={styles.legendItem}><i style={{ background: '#4ADE80' }} />Clean</span>
            <span className={styles.legendItem}><i style={{ background: '#FCD34D' }} />Moderate</span>
            <span className={styles.legendItem}><i style={{ background: '#EF4444' }} />Polluted</span>
          </div>
        </div>
      )}

      <div className={`${styles.layout} ${mode === 'page' ? styles.layoutPage : ''}`}>
        <div className={styles.mapShell}>
          <div className={styles.mapTopBar}>
            <span className={styles.mapBadge}>Leaflet live map</span>
            <span className={styles.mapMeta}>{devices.length} node{devices.length === 1 ? '' : 's'} tracked</span>
          </div>

          {/* Floating Overlay Card (Only in Page Mode) */}
          {isPageMode && selectedDevice && (
            <div className={styles.overlayCard}>
              <div className={styles.overlayTop}>
                <div>
                  <div className={styles.overlayLabel}>Selected device</div>
                  <div className={styles.overlayTitle}>{selectedDevice.cityLabel}</div>
                </div>
                <span className={styles.overlayAqi} style={{ color: selectedDevice.color }}>
                  AQI {selectedDevice.aqi}
                </span>
              </div>

              <div className={styles.overlayGrid}>
                <div className={styles.overlayItem}>
                  <span>Fine particle</span>
                  <strong>{selectedDevice.telemetry.pm25?.toFixed(1)}</strong>
                </div>
                <div className={styles.overlayItem}>
                  <span>Temp</span>
                  <strong>{selectedDevice.telemetry.temperature?.toFixed(1)} C</strong>
                </div>
                <div className={styles.overlayItem}>
                  <span>Humidity</span>
                  <strong>{selectedDevice.telemetry.humidity?.toFixed(1)} %</strong>
                </div>
                <div className={styles.overlayItem}>
                  <span>CO2</span>
                  <strong>{selectedDevice.telemetry.mq135?.toFixed(1)}</strong>
                </div>
                <div className={styles.overlayItem}>
                  <span>Last seen</span>
                  <strong>{selectedDevice.lastSeen}</strong>
                </div>
              </div>
            </div>
          )}

          <MapContainer
            center={DEFAULT_CENTER}
            zoom={11}
            zoomControl={false}
            attributionControl={false}
            className={styles.mapFrame}
            scrollWheelZoom
          >
            <TileLayer url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" maxZoom={19} />
            <ZoomControl position="bottomright" />
            <FitMapToDevices devices={devices} selectedCoords={selectedDevice?.coords} />

            {devices.map((device) => (
              <Marker
                key={device.cityKey}
                position={device.coords}
                icon={createMarkerIcon(device.color, device.cityKey === selectedCityKey)}
                eventHandlers={{
                  click: () => setSelectedCityKey(device.cityKey),
                }}
              >
                {!isPageMode && (
                  <Popup closeButton={false} offset={[0, -8]}>
                    <div className={styles.popupContent}>
                      <div className={styles.popupCity}>{device.cityLabel}</div>
                      <div className={styles.popupAqi}>AQI {device.aqi}</div>
                      <div className={styles.popupStatus} style={{ color: device.color }}>{device.status}</div>
                      <div className={styles.popupGrid}>
                        <div className={styles.popupItem}>
                          <span>PM2.5</span>
                          <strong>{device.telemetry.pm25?.toFixed(1)}</strong>
                        </div>
                        <div className={styles.popupItem}>
                          <span>Temp</span>
                          <strong>{device.telemetry.temperature?.toFixed(1)} C</strong>
                        </div>
                        <div className={styles.popupItem}>
                          <span>Humidity</span>
                          <strong>{device.telemetry.humidity?.toFixed(1)} %</strong>
                        </div>
                        <div className={styles.popupItem}>
                          <span>MQ135</span>
                          <strong>{device.telemetry.mq135?.toFixed(1)}</strong>
                        </div>
                        <div className={styles.popupItem}>
                          <span>Uptime</span>
                          <strong>{device.uptime?.toFixed(1)}%</strong>
                        </div>
                      </div>
                      <div className={styles.popupFoot}>
                        <span>{device.lastSeen}</span>
                        <span>{device.connectivity}</span>
                      </div>
                    </div>
                  </Popup>
                )}
              </Marker>
            ))}
          </MapContainer>
        </div>

        {/* Sidebar Navigation (Hidden in Page Mode) */}
        {!isPageMode && (
          <aside className={styles.nodeRail}>
            <div className={styles.railHeader}>
              <div>
                <div className={styles.railKicker}>Node overview</div>
                <div className={styles.railTitle}>AQI device status</div>
              </div>
            </div>

            <div className={styles.nodeList}>
              {devices.map((device) => {
                const isActive = device.cityKey === selectedCityKey
                const online = device.connectivity === 'online'

                return (
                  <button
                    key={device.cityKey}
                    type="button"
                    className={`${styles.nodeCard} ${isActive ? styles.nodeCardActive : ''}`}
                    onClick={() => setSelectedCityKey(device.cityKey)}
                  >
                    <div className={styles.nodeTop}>
                      <div>
                        <div className={styles.nodeCity}>{device.cityLabel}</div>
                        <div className={styles.nodeId}>{(device.nodeId ?? device.cityKey).toUpperCase()} · AQI {device.aqi}</div>
                      </div>
                      <span className={`${styles.statusPill} ${online ? styles.online : styles.offline}`}>
                        {online ? 'Online' : 'Offline'}
                      </span>
                    </div>

                    <div className={styles.nodeMeta}>
                      <span>{device.lastSeen}</span>
                      <span>{device.sampleRate} sync</span>
                    </div>
                  </button>
                )
              })}
            </div>

            {/* Detailed Info Card at the bottom of sidebar */}
            {selectedDevice && (
              <div className={styles.detailCard}>
                <div className={styles.detailHeader}>
                  <div>
                    <div className={styles.railKicker}>Selected node</div>
                    <div className={styles.detailTitle}>{selectedDevice.cityLabel}</div>
                  </div>
                  <span className={styles.detailAqi} style={{ color: selectedDevice.color }}>
                    AQI {selectedDevice.aqi}
                  </span>
                </div>

                <div className={styles.detailGrid}>
                  <div className={styles.detailItem}>
                    <span>Connectivity</span>
                    <strong>{selectedDevice.connectivity}</strong>
                  </div>
                  <div className={styles.detailItem}>
                    <span>Last seen</span>
                    <strong>{selectedDevice.lastSeen}</strong>
                  </div>
                  <div className={styles.detailItem}>
                    <span>PM2.5</span>
                    <strong>{selectedDevice.telemetry.pm25?.toFixed(1)} ug/m3</strong>
                  </div>
                  <div className={styles.detailItem}>
                    <span>Temperature</span>
                    <strong>{selectedDevice.telemetry.temperature?.toFixed(1)} C</strong>
                  </div>
                  <div className={styles.detailItem}>
                    <span>Humidity</span>
                    <strong>{selectedDevice.telemetry.humidity?.toFixed(1)} %</strong>
                  </div>
                  <div className={styles.detailItem}>
                    <span>MQ135</span>
                    <strong>{selectedDevice.telemetry.mq135?.toFixed(1)}</strong>
                  </div>
                  <div className={styles.detailItem}>
                    <span>Uptime</span>
                    <strong>{selectedDevice.uptime?.toFixed(1)}%</strong>
                  </div>
                </div>
              </div>
            )}
          </aside>
        )}
      </div>
    </section>
  )
}
