import { CITIES, aqiFromPM25, getAQIInfo } from './aqi'

export const DEVICE_DEMO_STORAGE_KEY = 'breezo-device-demo-data'

export const DEFAULT_DEVICE_DEMO_DATA = {
  ktm: {
    deviceId: 'KTM-01-1234',
    sourceLabel: 'BREEZO device feed',
    connectivity: 'online',
    lastSeen: '12 sec ago',
    uptime: 99.2,
    sampleRate: '15s',
    pm25: 62.4,
    temperature: 24.8,
    humidity: 58.4,
    mq135: 312.0,
    trendPm25: [58.2, 56.9, 55.1, 57.6, 59.0, 61.7, 63.8, 65.1, 64.4, 66.2, 68.1, 67.4],
    historyPm25: [54.1, 57.8, 61.2, 59.6, 63.4, 60.1, 62.4],
    historyTemperature: [23.4, 24.0, 24.6, 24.1, 25.2, 24.7, 24.8],
    historyHumidity: [61.2, 60.4, 59.1, 60.0, 58.6, 58.9, 58.4],
    historyMq135: [298.1, 302.4, 307.2, 304.6, 315.8, 309.9, 312.0],
    gps: { lat: 27.707268249932966, lon: 85.32864308198332, source: 'Live GPS' },
  },
  patan: {
    deviceId: 'PAT-01-2208',
    sourceLabel: 'BREEZO device feed',
    connectivity: 'online',
    lastSeen: '18 sec ago',
    uptime: 98.1,
    sampleRate: '20s',
    pm25: 38.7,
    temperature: 22.9,
    humidity: 64.8,
    mq135: 274.5,
    trendPm25: [34.8, 35.5, 36.1, 35.7, 36.4, 37.2, 38.0, 39.1, 38.8, 39.5, 39.1, 38.7],
    historyPm25: [31.4, 33.2, 35.1, 34.6, 36.0, 37.4, 38.7],
    historyTemperature: [21.8, 22.0, 22.4, 22.3, 22.6, 22.7, 22.9],
    historyHumidity: [68.2, 67.0, 66.1, 65.8, 65.0, 64.9, 64.8],
    historyMq135: [251.2, 258.4, 264.0, 266.8, 270.1, 272.6, 274.5],
    gps: { lat: 27.67344488290327, lon: 85.32537424684148, source: 'Live GPS' },
  },
  jawa: {
    deviceId: 'JAW-01-4412',
    sourceLabel: 'BREEZO device feed',
    connectivity: 'online',
    lastSeen: '27 sec ago',
    uptime: 97.4,
    sampleRate: '25s',
    pm25: 71.6,
    temperature: 29.4,
    humidity: 71.1,
    mq135: 356.2,
    trendPm25: [63.4, 64.9, 66.5, 67.8, 68.4, 69.2, 70.1, 71.8, 72.0, 72.4, 71.9, 71.6],
    historyPm25: [58.2, 60.6, 64.7, 66.2, 68.9, 70.8, 71.6],
    historyTemperature: [27.6, 27.9, 28.3, 28.6, 28.8, 29.1, 29.4],
    historyHumidity: [74.8, 74.1, 73.0, 72.6, 72.1, 71.6, 71.1],
    historyMq135: [322.5, 329.8, 338.4, 342.0, 348.7, 353.1, 356.2],
    gps: { lat: 27.671905776699937, lon: 85.30820161455541, source: 'Live GPS' },
  },
}

const ACTIVE_DEVICE_CITY_KEYS = Object.keys(DEFAULT_DEVICE_DEMO_DATA)

function clone(data) {
  return JSON.parse(JSON.stringify(data))
}

function readStoredDeviceDemoData() {
  if (typeof window === 'undefined') return clone(DEFAULT_DEVICE_DEMO_DATA)

  try {
    const raw = window.localStorage.getItem(DEVICE_DEMO_STORAGE_KEY)
    if (!raw) {
      const seeded = clone(DEFAULT_DEVICE_DEMO_DATA)
      window.localStorage.setItem(DEVICE_DEMO_STORAGE_KEY, JSON.stringify(seeded))
      return seeded
    }

    const parsed = JSON.parse(raw)
    const sanitized = ACTIVE_DEVICE_CITY_KEYS.reduce((acc, key) => {
      const merged = parsed[key] ? { ...clone(DEFAULT_DEVICE_DEMO_DATA[key]), ...parsed[key] } : clone(DEFAULT_DEVICE_DEMO_DATA[key])
      merged.gps = clone(DEFAULT_DEVICE_DEMO_DATA[key].gps)
      acc[key] = merged
      return acc
    }, {})

    window.localStorage.setItem(DEVICE_DEMO_STORAGE_KEY, JSON.stringify(sanitized))
    return sanitized
  } catch {
    return clone(DEFAULT_DEVICE_DEMO_DATA)
  }
}

export function getAllDeviceDemoData() {
  return readStoredDeviceDemoData()
}

export function saveAllDeviceDemoData(nextData) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(DEVICE_DEMO_STORAGE_KEY, JSON.stringify(nextData))
}

export function resetDeviceDemoData() {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(DEVICE_DEMO_STORAGE_KEY, JSON.stringify(DEFAULT_DEVICE_DEMO_DATA))
}

export function getActiveDeviceCityKeys() {
  return [...ACTIVE_DEVICE_CITY_KEYS]
}

export function getDeviceDemo(cityKey, city = CITIES[cityKey]) {
  const stored = readStoredDeviceDemoData()
  const fallbackCity = city ?? { key: cityKey, lat: 0, lon: 0 }

  return (
    stored[cityKey] ?? {
      deviceId: `${fallbackCity.key.toUpperCase()}-01-DEMO`,
      sourceLabel: 'BREEZO device feed',
      connectivity: 'offline',
      lastSeen: 'No recent packets',
      uptime: 0,
      sampleRate: '15s',
      pm25: 0,
      temperature: 25,
      humidity: 60,
      mq135: 300,
      trendPm25: Array.from({ length: 12 }, () => 0),
      historyPm25: Array.from({ length: 7 }, () => 0),
      historyTemperature: Array.from({ length: 7 }, () => 25),
      historyHumidity: Array.from({ length: 7 }, () => 60),
      historyMq135: Array.from({ length: 7 }, () => 300),
      gps: { lat: fallbackCity.lat, lon: fallbackCity.lon, source: 'City profile' },
    }
  )
}

export function buildDeviceAirSnapshot(cityKey) {
  const city = CITIES[cityKey]
  const device = getDeviceDemo(cityKey, city)
  const trendSeries = Array.isArray(device.trendPm25) && device.trendPm25.length
    ? device.trendPm25
    : Array.from({ length: 12 }, () => device.pm25 ?? 0)
  const historySeries = Array.isArray(device.historyPm25) && device.historyPm25.length
    ? device.historyPm25
    : Array.from({ length: 7 }, () => device.pm25 ?? 0)
  const historyTemperatureSeries = Array.isArray(device.historyTemperature) && device.historyTemperature.length
    ? device.historyTemperature
    : Array.from({ length: historySeries.length }, () => device.temperature ?? 25)
  const historyHumiditySeries = Array.isArray(device.historyHumidity) && device.historyHumidity.length
    ? device.historyHumidity
    : Array.from({ length: historySeries.length }, () => device.humidity ?? 60)
  const historyMq135Series = Array.isArray(device.historyMq135) && device.historyMq135.length
    ? device.historyMq135
    : Array.from({ length: historySeries.length }, () => device.mq135 ?? 300)

  const trend = {
    labels: trendSeries.map((_, index) => `${trendSeries.length - index - 1}h`),
    pm25: trendSeries.map((value) => Number((value ?? 0).toFixed(1))),
  }
  const history = historySeries.map((value, index) => {
    const pm25Value = Number((value ?? 0).toFixed(1))
    const day = new Date()
    day.setDate(day.getDate() - (historySeries.length - index - 1))
    const aqi = aqiFromPM25(pm25Value)

    return {
      label: day.toLocaleDateString([], { weekday: 'short' }),
      fullLabel: day.toLocaleDateString([], { month: 'short', day: 'numeric' }),
      pm25: pm25Value,
      temperature: Number((historyTemperatureSeries[index] ?? device.temperature ?? 25).toFixed(1)),
      humidity: Number((historyHumiditySeries[index] ?? device.humidity ?? 60).toFixed(1)),
      mq135: Number((historyMq135Series[index] ?? device.mq135 ?? 300).toFixed(1)),
      aqi,
      info: getAQIInfo(aqi),
    }
  })

  const pm25 = Number((device.pm25 ?? trend.pm25[trend.pm25.length - 1] ?? 0).toFixed(1))
  const aqi = aqiFromPM25(pm25)

  return {
    aqi,
    info: getAQIInfo(aqi),
    pm25,
    temperature: device.temperature ?? null,
    humidity: device.humidity ?? null,
    mq135: device.mq135 ?? null,
    connectivity: device.connectivity ?? 'offline',
    lastSeen: device.lastSeen ?? 'No recent packets',
    uptime: device.uptime ?? 0,
    sampleRate: device.sampleRate ?? '15s',
    gps: device.gps ?? { lat: city.lat, lon: city.lon, source: 'City profile' },
    sourceLabel: device.sourceLabel ?? 'BREEZO device feed',
    trend,
    history,
  }
}
