import { useState, useEffect, useCallback } from 'react'
import { CITIES, aqiFromPM25, getAQIInfo } from '../lib/aqi'
import { buildDeviceAirSnapshot } from '../lib/deviceDemo'
import { fetchMapNodes } from '../services/map.service'
import { resolveLocationName } from '../services/location.service'
import { socket } from '../sockets/socket.client'

const cache = {}
const CACHE_TTL = 5 * 60 * 1000

function distanceSquared(aLat, aLon, bLat, bLon) {
  return ((aLat ?? 0) - (bLat ?? 0)) ** 2 + ((aLon ?? 0) - (bLon ?? 0)) ** 2
}

function getNodeCoordinates(node) {
  return {
    lat: node?.lat ?? node?.location?.lat ?? null,
    lon: node?.lng ?? node?.location?.lng ?? node?.location?.lon ?? null,
  }
}

function getClosestCityKey(node) {
  const { lat, lon } = getNodeCoordinates(node)
  if (lat == null || lon == null) return null

  let bestKey = null
  let bestDistance = Infinity

  Object.values(CITIES).forEach((city) => {
    const nextDistance = distanceSquared(lat, lon, city.lat, city.lon)
    if (nextDistance < bestDistance) {
      bestDistance = nextDistance
      bestKey = city.key
    }
  })

  return bestKey
}

function getFallbackLocationLabel(node, cityKey) {
  if (cityKey && CITIES[cityKey]) return CITIES[cityKey].label
  return node?.nodeId || 'Unknown node'
}

async function mergeLiveNodeWithFallback(cityKey, node) {
  const fallback = buildDeviceAirSnapshot(cityKey)
  const { lat, lon } = getNodeCoordinates(node)
  const pm25 = Number(node?.pm25 ?? fallback.pm25 ?? 0)
  const aqi = Number(node?.aqi ?? aqiFromPM25(pm25))
  const fallbackLocationLabel = getFallbackLocationLabel(node, cityKey)
  const locationLabel = await resolveLocationName(lat, lon, fallbackLocationLabel)

  return {
    ...fallback,
    aqi,
    info: getAQIInfo(aqi),
    pm25,
    temperature: Number(node?.temperature ?? fallback.temperature ?? 0),
    humidity: Number(node?.humidity ?? fallback.humidity ?? 0),
    mq135: Number(node?.mq135 ?? node?.co2 ?? fallback.mq135 ?? 0),
    connectivity: node?.syncing ? 'syncing' : (node?.connectivity ?? fallback.connectivity ?? 'online'),
    lastSeen: node?.lastSeen ?? fallback.lastSeen,
    uptime: Number(node?.uptime ?? fallback.uptime ?? 0),
    sampleRate: node?.sampleRate ?? fallback.sampleRate,
    gps: {
      lat: lat ?? fallback.gps?.lat ?? CITIES[cityKey]?.lat ?? 0,
      lon: lon ?? fallback.gps?.lon ?? CITIES[cityKey]?.lon ?? 0,
      source: 'Live GPS',
    },
    sourceLabel: 'Live server feed',
    locationLabel,
    nodeId: node?.nodeId ?? cityKey,
  }
}

async function mapLiveNodeToAirSnapshot(node) {
  const cityKey = getClosestCityKey(node)
  const fallbackKey = cityKey ?? node?.nodeId ?? 'live'
  const fallback = buildDeviceAirSnapshot(fallbackKey)
  const { lat, lon } = getNodeCoordinates(node)
  const pm25 = Number(node?.pm25 ?? fallback.pm25 ?? 0)
  const aqi = Number(node?.aqi ?? aqiFromPM25(pm25))
  const fallbackLocationLabel = getFallbackLocationLabel(node, cityKey)
  const locationLabel = await resolveLocationName(lat, lon, fallbackLocationLabel)

  return {
    ...fallback,
    key: node?.nodeId ?? `${lat ?? 'unknown'}-${lon ?? 'unknown'}`,
    nodeId: node?.nodeId,
    locationLabel,
    aqi,
    info: getAQIInfo(aqi),
    pm25,
    temperature: Number(node?.temperature ?? fallback.temperature ?? 0),
    humidity: Number(node?.humidity ?? fallback.humidity ?? 0),
    mq135: Number(node?.mq135 ?? node?.co2 ?? fallback.mq135 ?? 0),
    connectivity: node?.syncing ? 'syncing' : (node?.connectivity ?? 'online'),
    lastSeen: node?.lastSeen ?? 'just now',
    gps: {
      lat: lat ?? fallback.gps?.lat ?? 0,
      lon: lon ?? fallback.gps?.lon ?? 0,
      source: 'Live GPS',
    },
    sourceLabel: 'Live server feed',
  }
}

async function fetchAllNodesRaw() {
  const cached = cache.__all__
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data
  }

  const nodes = await fetchMapNodes()
  cache.__all__ = { data: nodes, timestamp: Date.now() }
  return nodes
}

async function fetchCityRaw(cityKey) {
  const cached = cache[cityKey]
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data
  }

  const nodes = await fetchAllNodesRaw()
  const matchedNode = nodes.find((node) => getClosestCityKey(node) === cityKey)
  const data = matchedNode ? await mergeLiveNodeWithFallback(cityKey, matchedNode) : buildDeviceAirSnapshot(cityKey)
  cache[cityKey] = { data, timestamp: Date.now() }
  return data
}

export function useAirQuality(cityKey) {
  const [state, setState] = useState({ data: null, loading: true, error: null })

  const fetch_ = useCallback(async (key) => {
    setState((current) => ({ ...current, loading: true, error: null }))

    try {
      const raw = await fetchCityRaw(key)
      setState({ data: raw, loading: false, error: null })
    } catch (error) {
      setState((current) => ({
        data: current.data,
        loading: false,
        error: error.message || 'Unable to load device data',
      }))
    }
  }, [])

  useEffect(() => {
    fetch_(cityKey)
    const interval = setInterval(() => {
      delete cache[cityKey]
      delete cache.__all__
      fetch_(cityKey)
    }, CACHE_TTL)

    return () => clearInterval(interval)
  }, [cityKey, fetch_])

  return {
    ...state,
    refetch: () => {
      delete cache[cityKey]
      delete cache.__all__
      fetch_(cityKey)
    },
  }
}

export function useMultiCityAQI(cityKeys) {
  const [results, setResults] = useState({})

  useEffect(() => {
    let cancelled = false

    async function fetchAll() {
      try {
        const nodes = await fetchAllNodesRaw()
        const next = {}

        const entries = await Promise.all(
          cityKeys.map(async (key) => {
            const matchedNode = nodes.find((node) => getClosestCityKey(node) === key)
            const value = matchedNode ? await mergeLiveNodeWithFallback(key, matchedNode) : buildDeviceAirSnapshot(key)
            return [key, value]
          })
        )

        entries.forEach(([key, value]) => {
          next[key] = value
        })

        if (!cancelled) {
          setResults(next)
        }
      } catch {
        const fallback = {}
        cityKeys.forEach((key) => {
          fallback[key] = buildDeviceAirSnapshot(key)
        })
        if (!cancelled) {
          setResults(fallback)
        }
      }
    }

    fetchAll()
    const interval = setInterval(() => {
      delete cache.__all__
      cityKeys.forEach((key) => delete cache[key])
      fetchAll()
    }, CACHE_TTL)

    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [cityKeys.join(',')])

  return results
}

export function useLiveNodeAQI() {
  const [results, setResults] = useState([])

  useEffect(() => {
    let cancelled = false

    async function fetchAll() {
      try {
        const nodes = await fetchAllNodesRaw()
        const next = await Promise.all(nodes.map(mapLiveNodeToAirSnapshot))

        if (!cancelled) {
          setResults(next)
        }
      } catch {
        if (!cancelled) {
          setResults([])
        }
      }
    }

    async function applyNodeUpdate(node) {
      const updated = await mapLiveNodeToAirSnapshot(node)
      if (cancelled) return

      setResults((current) => {
        const index = current.findIndex((item) => item.key === updated.key)
        if (index === -1) return [...current, updated]

        const next = [...current]
        next[index] = updated
        return next
      })
    }

    fetchAll()
    socket.connect()
    socket.on('node:update', applyNodeUpdate)

    const interval = setInterval(() => {
      delete cache.__all__
      fetchAll()
    }, CACHE_TTL)

    return () => {
      cancelled = true
      clearInterval(interval)
      socket.off('node:update', applyNodeUpdate)
    }
  }, [])

  return results
}
