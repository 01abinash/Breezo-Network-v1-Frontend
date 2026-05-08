const LOCATION_CACHE_KEY = 'breezo-location-cache'

const memoryCache = new Map()

function buildCacheKey(lat, lon) {
  return `${Number(lat).toFixed(5)},${Number(lon).toFixed(5)}`
}

function readStoredCache() {
  if (typeof window === 'undefined') return {}

  try {
    return JSON.parse(window.localStorage.getItem(LOCATION_CACHE_KEY) || '{}')
  } catch {
    return {}
  }
}

function writeStoredCache(cache) {
  if (typeof window === 'undefined') return

  try {
    window.localStorage.setItem(LOCATION_CACHE_KEY, JSON.stringify(cache))
  } catch {
    // Ignore storage write failures.
  }
}

function pickBestAddressLabel(address = {}) {
  return (
    address.suburb ||
    address.neighbourhood ||
    address.city_district ||
    address.town ||
    address.village ||
    address.city ||
    address.municipality ||
    address.county ||
    null
  )
}

export async function resolveLocationName(lat, lon, fallback = 'Unknown location') {
  if (lat == null || lon == null) return fallback

  const cacheKey = buildCacheKey(lat, lon)
  if (memoryCache.has(cacheKey)) {
    return memoryCache.get(cacheKey)
  }

  const storedCache = readStoredCache()
  if (storedCache[cacheKey]) {
    memoryCache.set(cacheKey, storedCache[cacheKey])
    return storedCache[cacheKey]
  }

  try {
    const url = new URL('https://nominatim.openstreetmap.org/reverse')
    url.searchParams.set('format', 'jsonv2')
    url.searchParams.set('lat', lat)
    url.searchParams.set('lon', lon)
    url.searchParams.set('zoom', '18')
    url.searchParams.set('addressdetails', '1')

    const response = await fetch(url.toString(), {
      headers: {
        Accept: 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`Reverse geocoding failed with ${response.status}`)
    }

    const payload = await response.json()
    const locationName =
      pickBestAddressLabel(payload?.address) ||
      payload?.name ||
      payload?.display_name?.split(',')?.[0]?.trim() ||
      fallback

    memoryCache.set(cacheKey, locationName)
    writeStoredCache({
      ...storedCache,
      [cacheKey]: locationName,
    })

    return locationName
  } catch {
    return fallback
  }
}
